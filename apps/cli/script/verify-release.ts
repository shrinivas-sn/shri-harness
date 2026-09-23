#!/usr/bin/env bun

import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";
import { RELEASE_REPOSITORY, RELEASE_TARGETS } from "./package-release";

export const RELEASE_CANARY = "gsk_SHRI_RELEASE_TEST_CANARY_DO_NOT_USE";

export interface ReleaseCheck {
	id: string;
	pass: boolean;
}

const wrapperName = "@shrinivas-sn/shri";
const commonFiles = ["package.json", "README.md", "LICENSE", "NOTICE"];
const credentialPatterns = [
	/gsk_[A-Za-z0-9_-]{16,}/,
	/sk-[A-Za-z0-9_-]{20,}/,
	/gh[pousr]_[A-Za-z0-9_]{20,}/,
	/AKIA[0-9A-Z]{16}/,
	/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=\r\n]{64,}-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

function hash(bytes: Buffer): string {
	return createHash("sha256").update(bytes).digest("hex");
}

function check(id: string, pass: boolean): ReleaseCheck {
	return { id, pass };
}

function safeTarPath(path: string): string {
	const parts = path.split("/");
	if (
		!path ||
		path.includes("\\") ||
		path.includes("\0") ||
		path.startsWith("/") ||
		/^[A-Za-z]:/.test(path) ||
		!path.startsWith("package/") ||
		parts.some(
			(part) =>
				part === ".." ||
				part === "." ||
				!part ||
				/[<>:"|?*]/.test(part) ||
				/[. ]$/.test(part) ||
				/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part),
		)
	) {
		throw new Error("Unsafe tar path");
	}
	return path;
}

function tarString(block: Buffer, offset: number, length: number): string {
	const bytes = block.subarray(offset, offset + length);
	const end = bytes.indexOf(0);
	return bytes.subarray(0, end < 0 ? length : end).toString("utf8");
}

function tarNumber(block: Buffer, offset: number, length: number): number {
	const value = tarString(block, offset, length).trim();
	if (!/^[0-7]*$/.test(value)) throw new Error("Invalid tar number");
	return value ? Number.parseInt(value, 8) : 0;
}

/** Parse the actual uncompressed tar bytes. Reject links and unsupported extensions. */
export function parseTarballEntries(tar: Buffer): Map<string, Buffer> {
	const files = new Map<string, Buffer>();
	let offset = 0;
	let ended = false;
	while (offset + 512 <= tar.length) {
		const header = tar.subarray(offset, offset + 512);
		if (header.every((byte) => byte === 0)) {
			ended = true;
			break;
		}
		const storedChecksum = tarNumber(header, 148, 8);
		let checksum = 0;
		for (let i = 0; i < 512; i++)
			checksum += i >= 148 && i < 156 ? 32 : header[i];
		if (checksum !== storedChecksum) throw new Error("Invalid tar checksum");
		const name = tarString(header, 0, 100);
		const prefix = tarString(header, 345, 155);
		const path = safeTarPath(prefix ? `${prefix}/${name}` : name);
		const size = tarNumber(header, 124, 12);
		const type = tarString(header, 156, 1);
		const dataStart = offset + 512;
		const dataEnd = dataStart + size;
		if (!Number.isSafeInteger(size) || dataEnd > tar.length)
			throw new Error("Truncated tar entry");
		if (type === "" || type === "0") {
			if (files.has(path)) throw new Error("Duplicate tar entry");
			files.set(path, tar.subarray(dataStart, dataEnd));
		} else if (type !== "5") {
			throw new Error("Unsupported tar entry type");
		}
		offset = dataStart + Math.ceil(size / 512) * 512;
	}
	if (!ended || files.size === 0)
		throw new Error("Incomplete or empty tarball");
	return files;
}

function expectedPaths(target: string): string[] {
	return target === "wrapper"
		? [...commonFiles, "bin/shri.cjs", "bin/ca-certs.cjs"]
		: [
				...commonFiles,
				`bin/${target.startsWith("windows-") ? "shri.exe" : "shri"}`,
				"extensions/plugin-sandbox-bootstrap.js",
			];
}

function hasCredential(bytes: Buffer): boolean {
	const text = bytes.toString("latin1");
	return credentialPatterns.some((pattern) => pattern.test(text));
}

function validManifest(
	manifest: unknown,
	target: string,
	version: string,
): ReleaseCheck[] {
	if (!manifest || typeof manifest !== "object") {
		return [
			check("manifest", false),
			check("version", false),
			check("repository", false),
			check("dependencies", false),
		];
	}
	const pkg = manifest as Record<string, unknown>;
	const expectedName =
		target === "wrapper" ? wrapperName : `${wrapperName}-${target}`;
	const expectedBin =
		target === "wrapper"
			? "bin/shri.cjs"
			: `bin/${target.startsWith("windows-") ? "shri.exe" : "shri"}`;
	const deps = [
		pkg.dependencies,
		pkg.devDependencies,
		pkg.peerDependencies,
		pkg.optionalDependencies,
	];
	const flat = deps.flatMap((value) =>
		value && typeof value === "object" ? Object.entries(value) : [],
	);
	const allowed =
		target === "wrapper"
			? RELEASE_TARGETS.map((item) => `${wrapperName}-${item.os}-${item.arch}`)
			: [];
	const optional = pkg.optionalDependencies;
	const optionalEntries =
		optional && typeof optional === "object" && !Array.isArray(optional)
			? Object.entries(optional)
			: [];
	return [
		check(
			"manifest",
			pkg.name === expectedName &&
				(pkg.bin as Record<string, unknown> | undefined)?.shri ===
					expectedBin &&
				pkg.license === "Apache-2.0" &&
				(target === "wrapper" ||
					(JSON.stringify(pkg.os) ===
						JSON.stringify([
							target.startsWith("windows-") ? "win32" : target.split("-")[0],
						]) &&
						JSON.stringify(pkg.cpu) ===
							JSON.stringify([target.split("-")[1]]))),
		),
		check("version", pkg.version === version),
		check(
			"repository",
			(pkg.repository as Record<string, unknown> | undefined)?.type ===
				RELEASE_REPOSITORY.type &&
				(pkg.repository as Record<string, unknown> | undefined)?.url ===
					RELEASE_REPOSITORY.url,
		),
		check(
			"dependencies",
			flat.every(
				([name, value]) =>
					typeof value === "string" &&
					!value.includes("workspace:") &&
					(target !== "wrapper" ||
						(allowed.includes(name) && value === version)),
			) &&
				(target === "wrapper"
					? optionalEntries.length > 0 && optionalEntries.length === flat.length
					: flat.length === 0),
		),
	];
}

export function inspectReleaseFiles(
	files: Map<string, Buffer>,
	target: string,
	version: string,
): ReleaseCheck[] {
	const relativePaths = [...files.keys()].map((path) =>
		path.startsWith("package/") ? path.slice(8) : path,
	);
	const required = expectedPaths(target);
	const binaryPath =
		target === "wrapper"
			? "bin/shri.cjs"
			: `bin/${target.startsWith("windows-") ? "shri.exe" : "shri"}`;
	let manifest: unknown;
	try {
		manifest = JSON.parse(
			files.get("package/package.json")?.toString("utf8") ?? "",
		);
	} catch {
		manifest = undefined;
	}
	const binary = files.get(`package/${binaryPath}`);
	const pathCheck =
		relativePaths.every((path) => required.includes(path)) &&
		files.size === relativePaths.length;
	const checks = [
		check(
			"paths",
			pathCheck &&
				[...files.keys()].every(
					(path) => path.startsWith("package/") && !/[\\]/.test(path),
				),
		),
		check(
			"inventory",
			required.every((path) => files.has(`package/${path}`)),
		),
		check(
			"attribution",
			["README.md", "LICENSE", "NOTICE"].every(
				(path) => (files.get(`package/${path}`)?.length ?? 0) > 0,
			),
		),
		check(
			"credentials",
			[...files.values()].every((bytes) => !hasCredential(bytes)),
		),
		check(
			"executable",
			!!binary &&
				binary.length > 0 &&
				(target === "wrapper" ||
					(target.startsWith("windows-")
						? binary.subarray(0, 2).toString() === "MZ"
						: target.startsWith("linux-")
							? binary
									.subarray(0, 4)
									.equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))
							: binary
									.subarray(0, 4)
									.equals(Buffer.from([0xcf, 0xfa, 0xed, 0xfe])))),
		),
	];
	if (target !== "wrapper") {
		checks.push(
			check(
				"bootstrap",
				(files.get("package/extensions/plugin-sandbox-bootstrap.js")?.length ??
					0) > 0,
			),
		);
		checks.push(
			check(
				"worker",
				!!binary?.includes(Buffer.from("parser.worker.js")) &&
					!!binary?.includes(Buffer.from("OTUI_TREE_SITTER_WORKER_PATH")),
			),
		);
		checks.push(
			check(
				"native",
				!!binary?.includes(Buffer.from("OPENTUI_LIBC")) &&
					!!binary?.includes(Buffer.from("@opentui/core")),
			),
		);
	}
	return [...checks, ...validManifest(manifest, target, version)];
}

function removeTemporary(path: string): void {
	const parent = resolve(tmpdir());
	const rel = relative(parent, resolve(path));
	if (
		!rel ||
		rel === ".." ||
		rel.startsWith(`..${sep}`) ||
		isAbsolute(rel) ||
		!basename(path).startsWith("shri-verify-")
	) {
		throw new Error("Unsafe temporary cleanup target");
	}
	rmSync(path, { recursive: true, force: true });
}

function inventoryFolder(path: string): Map<string, Buffer> {
	const files = new Map<string, Buffer>();
	function walk(folder: string): void {
		for (const item of readdirSync(folder, { withFileTypes: true })) {
			const entry = join(folder, item.name);
			if (item.isSymbolicLink())
				throw new Error("Release input contains symlink");
			if (item.isDirectory()) walk(entry);
			else if (item.isFile())
				files.set(
					`package/${relative(path, entry).replaceAll("\\", "/")}`,
					readFileSync(entry),
				);
			else throw new Error("Release input contains unsupported file");
		}
	}
	walk(path);
	return files;
}

function patchedSourcesPresent(cliDir: string): boolean {
	const rootDir = resolve(cliDir, "..", "..");
	const dialogPath = join(
		cliDir,
		"node_modules",
		"@opentui-ui",
		"dialog",
		"dist",
		"dialog-container-Btgzkwy7.mjs",
	);
	const bunStore = join(rootDir, "node_modules", ".bun");
	const ollamaDirectory = readdirSync(bunStore).find((name) =>
		name.startsWith("ollama-ai-provider-v2@4.0.1+"),
	);
	if (!ollamaDirectory || !existsSync(dialogPath)) return false;
	const ollamaPath = join(
		bunStore,
		ollamaDirectory,
		"node_modules",
		"ollama-ai-provider-v2",
		"dist",
		"index.js",
	);
	if (!existsSync(ollamaPath)) return false;
	const dialog = readFileSync(dialogPath, "utf8");
	const ollama = readFileSync(ollamaPath, "utf8");
	return (
		dialog.includes("this.remove(renderable);") &&
		!dialog.includes("this.remove(renderable.id);") &&
		ollama.includes("return void 0;") &&
		ollama.includes('"error" in parsed') &&
		existsSync(join(rootDir, "patches", "@opentui-ui%2Fdialog@0.1.2.patch")) &&
		existsSync(join(rootDir, "patches", "ollama-ai-provider-v2@4.0.1.patch"))
	);
}

function inspectOne(input: {
	packageDir: string;
	target: string;
	version: string;
	tarballDir: string;
}): Record<string, unknown> {
	const sourceFiles = inventoryFolder(input.packageDir);
	const inputChecks = inspectReleaseFiles(
		sourceFiles,
		input.target,
		input.version,
	);
	if (inputChecks.some((item) => !item.pass))
		throw new Error(
			`Release input failed: ${input.target}: ${inputChecks
				.filter((item) => !item.pass)
				.map((item) => item.id)
				.join(", ")}`,
		);
	const result = Bun.spawnSync(
		[
			process.platform === "win32" ? "npm.cmd" : "npm",
			"pack",
			"--json",
			"--ignore-scripts",
			"--offline",
			"--pack-destination",
			input.tarballDir,
		],
		{
			cwd: input.packageDir,
			env: {
				...process.env,
				npm_config_userconfig: join(input.tarballDir, "missing-user-npmrc"),
				npm_config_globalconfig: join(input.tarballDir, "missing-global-npmrc"),
			},
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	if (result.exitCode !== 0)
		throw new Error(
			`npm pack failed for ${input.target} (exit ${result.exitCode})`,
		);
	let packInfo: { filename?: string }[];
	try {
		packInfo = JSON.parse(result.stdout.toString());
	} catch {
		throw new Error(`npm pack returned invalid JSON for ${input.target}`);
	}
	if (
		packInfo.length !== 1 ||
		!packInfo[0]?.filename ||
		basename(packInfo[0].filename) !== packInfo[0].filename
	)
		throw new Error("Unexpected npm pack output");
	const tarballPath = join(input.tarballDir, packInfo[0].filename);
	const tarball = readFileSync(tarballPath);
	const tarBytes = gunzipSync(tarball);
	if (hasCredential(tarBytes))
		throw new Error(
			`Packed tar bytes failed credentials check: ${input.target}`,
		);
	const files = parseTarballEntries(tarBytes);
	const temporary = mkdtempSync(join(tmpdir(), "shri-verify-"));
	try {
		for (const [path, bytes] of files) {
			const destination = resolve(temporary, path);
			const rel = relative(temporary, destination);
			if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
				throw new Error("Unsafe tar path");
			mkdirSync(resolve(destination, ".."), { recursive: true });
			writeFileSync(destination, bytes);
		}
		const extracted = inventoryFolder(join(temporary, "package"));
		const checks = inspectReleaseFiles(extracted, input.target, input.version);
		if (input.target !== "wrapper") {
			const artifactDir = resolve(
				input.packageDir,
				"..",
				"..",
				`cli-${input.target}`,
			);
			const executable = input.target.startsWith("windows-")
				? "shri.exe"
				: "shri";
			const compiledExecutable = input.target.startsWith("windows-")
				? "cline.exe"
				: "cline";
			const artifactBinary = join(artifactDir, "bin", compiledExecutable);
			const artifactBootstrap = join(
				artifactDir,
				"extensions",
				"plugin-sandbox-bootstrap.js",
			);
			checks.push(
				check(
					"artifact-equality",
					existsSync(artifactBinary) &&
						existsSync(artifactBootstrap) &&
						hash(readFileSync(artifactBinary)) ===
							hash(
								extracted.get(`package/bin/${executable}`) ?? Buffer.alloc(0),
							) &&
						hash(readFileSync(artifactBootstrap)) ===
							hash(
								extracted.get(
									"package/extensions/plugin-sandbox-bootstrap.js",
								) ?? Buffer.alloc(0),
							),
				),
			);
		}
		checks.push(
			check(
				"source-equality",
				sourceFiles.size === extracted.size &&
					[...sourceFiles].every(
						([path, bytes]) =>
							extracted.has(path) && hash(bytes) === hash(extracted.get(path)!),
					),
			),
		);
		if (checks.some((item) => !item.pass))
			throw new Error(
				`Packed output failed: ${input.target}: ${checks
					.filter((item) => !item.pass)
					.map((item) => item.id)
					.join(", ")}`,
			);
		return {
			package: (
				JSON.parse(extracted.get("package/package.json")!.toString()) as {
					name: string;
				}
			).name,
			version: input.version,
			target: input.target,
			tarball: relative(
				resolve(input.tarballDir, ".."),
				tarballPath,
			).replaceAll("\\", "/"),
			size: statSync(tarballPath).size,
			sha256: hash(tarball),
			inventory: [...extracted.keys()].sort().map((path) => ({
				path: path.slice(8),
				size: extracted.get(path)!.length,
				sha256: hash(extracted.get(path)!),
			})),
			checks,
		};
	} finally {
		removeTemporary(temporary);
	}
}

if (import.meta.main) {
	const cliDir = resolve(import.meta.dir, "..");
	const outputDir = join(cliDir, "dist", "npm");
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: { target: { type: "string", multiple: true } },
		strict: true,
	});
	const version = (
		JSON.parse(readFileSync(join(cliDir, "package.json"), "utf8")) as {
			version: string;
		}
	).version;
	const wrapperDir = join(outputDir, "shri");
	if (!existsSync(wrapperDir))
		throw new Error(
			"Missing generated wrapper package; run package:release first",
		);
	const wrapperManifest = JSON.parse(
		readFileSync(join(wrapperDir, "package.json"), "utf8"),
	) as { optionalDependencies?: Record<string, string> };
	const targets =
		values.target ??
		RELEASE_TARGETS.filter(
			(item) =>
				wrapperManifest.optionalDependencies?.[
					`${wrapperName}-${item.os}-${item.arch}`
				] === version,
		).map((item) => `${item.os}-${item.arch}`);
	if (
		targets.length === 0 ||
		new Set(targets).size !== targets.length ||
		targets.some(
			(target) =>
				!RELEASE_TARGETS.some((item) => `${item.os}-${item.arch}` === target),
		)
	)
		throw new Error("No valid release targets selected");
	const declaredTargets = Object.keys(
		wrapperManifest.optionalDependencies ?? {},
	).map((name) =>
		name.startsWith(`${wrapperName}-`)
			? name.slice(wrapperName.length + 1)
			: "",
	);
	if (
		declaredTargets.length !== targets.length ||
		declaredTargets.some((target) => !targets.includes(target))
	)
		throw new Error("Selected targets do not match wrapper dependencies");
	const tarballDir = join(outputDir, "tarballs");
	mkdirSync(tarballDir, { recursive: true });
	const packages = ["wrapper", ...targets].map((target) =>
		inspectOne({
			packageDir: join(
				outputDir,
				target === "wrapper" ? "shri" : `shri-${target}`,
			),
			target,
			version,
			tarballDir,
		}),
	);
	const report = {
		schemaVersion: 1,
		scope: "release inputs and packed outputs; not historical Git",
		patchProvenance: {
			check: "patched-source-inputs",
			pass: patchedSourcesPresent(cliDir),
		},
		packages,
	};
	if (!report.patchProvenance.pass)
		throw new Error("Patched source inputs not verified");
	const reportBytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
	if (hasCredential(reportBytes))
		throw new Error("Release report failed credentials check");
	writeFileSync(join(outputDir, "verification-report.json"), reportBytes);
	console.log(
		`Verified ${packages.length} local Shri tarballs. Report: dist/npm/verification-report.json`,
	);
}
