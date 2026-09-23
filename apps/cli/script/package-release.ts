#!/usr/bin/env bun

import {
	chmodSync,
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";

export const RELEASE_TARGETS = [
	{
		os: "darwin",
		arch: "arm64",
		artifactDirectory: "cli-darwin-arm64",
		binaryName: "cline",
	},
	{
		os: "linux",
		arch: "x64",
		artifactDirectory: "cli-linux-x64",
		binaryName: "cline",
	},
	{
		os: "windows",
		arch: "x64",
		artifactDirectory: "cli-windows-x64",
		binaryName: "cline.exe",
	},
] as const;

export const RELEASE_REPOSITORY = {
	type: "git",
	url: "git+https://github.com/shrinivas-sn/shri-harness.git",
} as const;

type ReleaseTarget = (typeof RELEASE_TARGETS)[number];

export interface CreateReleasePackagesInput {
	artifactsDir: string;
	outputDir: string;
	version: string;
	readmePath: string;
	licensePath: string;
	wrapperPath: string;
	wrapperContents: string;
	caCertsPath: string;
	noticePath: string;
	targetIds?: string[];
}

function ensureWithin(target: string, parent: string): void {
	const relativeTarget = relative(resolve(parent), resolve(target));
	if (
		!relativeTarget ||
		relativeTarget === ".." ||
		relativeTarget.startsWith(`..${sep}`) ||
		isAbsolute(relativeTarget)
	) {
		throw new Error(`Refusing release output outside ${resolve(parent)}`);
	}
}

function writeJson(path: string, value: unknown): void {
	writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function copyRequiredFile(source: string, destination: string): void {
	if (!existsSync(source) || !statSync(source).isFile()) {
		throw new Error(`Missing required release file: ${source}`);
	}
	mkdirSync(dirname(destination), { recursive: true });
	copyFileSync(source, destination);
	chmodSync(destination, statSync(source).mode);
}

function platformPackageName(target: ReleaseTarget): string {
	return `@shrinivas-sn/shri-${target.os}-${target.arch}`;
}

export function createReleasePackages(input: CreateReleasePackagesInput): void {
	if (
		!existsSync(input.readmePath) ||
		!existsSync(input.licensePath) ||
		!existsSync(input.noticePath)
	) {
		throw new Error("Release packages require README.md, LICENSE, and NOTICE.");
	}
	const requestedIds =
		input.targetIds ??
		RELEASE_TARGETS.map((target) => `${target.os}-${target.arch}`);
	if (
		requestedIds.length === 0 ||
		new Set(requestedIds).size !== requestedIds.length
	) {
		throw new Error("Release targets must be non-empty and unique.");
	}
	const targets = requestedIds.map((id) => {
		const target = RELEASE_TARGETS.find(
			(candidate) => `${candidate.os}-${candidate.arch}` === id,
		);
		if (!target) throw new Error(`Unsupported release target: ${id}`);
		if (!existsSync(join(input.artifactsDir, target.artifactDirectory))) {
			throw new Error(`Missing platform artifact: ${target.artifactDirectory}`);
		}
		return target;
	});
	if (!existsSync(input.caCertsPath)) {
		throw new Error(`Missing release CA helper: ${input.caCertsPath}`);
	}
	if (!input.wrapperContents.trim()) {
		throw new Error(`Missing release wrapper: ${input.wrapperPath}`);
	}
	const artifactRoot = resolve(input.artifactsDir);
	if (resolve(input.outputDir) !== join(artifactRoot, "npm")) {
		throw new Error(
			"Release output must be the artifact root's npm directory.",
		);
	}
	for (const target of targets) {
		const sourceDir = join(input.artifactsDir, target.artifactDirectory);
		for (const source of [
			join(sourceDir, "bin", target.binaryName),
			join(sourceDir, "extensions", "plugin-sandbox-bootstrap.js"),
		]) {
			if (!existsSync(source) || !statSync(source).isFile()) {
				throw new Error(`Missing required release file: ${source}`);
			}
		}
	}
	ensureWithin(input.outputDir, artifactRoot);
	rmSync(input.outputDir, { recursive: true, force: true });
	mkdirSync(input.outputDir, { recursive: true });

	const optionalDependencies: Record<string, string> = {};
	for (const target of targets) {
		const sourceDir = join(input.artifactsDir, target.artifactDirectory);
		const packageDir = join(
			input.outputDir,
			`shri-${target.os}-${target.arch}`,
		);
		const packageName = platformPackageName(target);
		const releaseBinaryName = target.os === "windows" ? "shri.exe" : "shri";
		copyRequiredFile(
			join(sourceDir, "bin", target.binaryName),
			join(packageDir, "bin", releaseBinaryName),
		);
		copyRequiredFile(
			join(sourceDir, "extensions", "plugin-sandbox-bootstrap.js"),
			join(packageDir, "extensions", "plugin-sandbox-bootstrap.js"),
		);
		copyRequiredFile(input.readmePath, join(packageDir, "README.md"));
		copyRequiredFile(input.licensePath, join(packageDir, "LICENSE"));
		copyRequiredFile(input.noticePath, join(packageDir, "NOTICE"));
		writeJson(join(packageDir, "package.json"), {
			name: packageName,
			version: input.version,
			repository: RELEASE_REPOSITORY,
			description: `Shri terminal executable for ${target.os} ${target.arch}`,
			license: "Apache-2.0",
			os: [target.os === "windows" ? "win32" : target.os],
			cpu: [target.arch],
			bin: { shri: `bin/${releaseBinaryName}` },
			files: ["bin", "extensions", "NOTICE"],
		});
		optionalDependencies[packageName] = input.version;
	}

	const wrapperDir = join(input.outputDir, "shri");
	mkdirSync(join(wrapperDir, "bin"), { recursive: true });
	const releaseWrapperPath = join(wrapperDir, "bin", "shri.cjs");
	writeFileSync(releaseWrapperPath, input.wrapperContents);
	chmodSync(releaseWrapperPath, 0o755);
	copyRequiredFile(input.caCertsPath, join(wrapperDir, "bin", "ca-certs.cjs"));
	copyRequiredFile(input.readmePath, join(wrapperDir, "README.md"));
	copyRequiredFile(input.licensePath, join(wrapperDir, "LICENSE"));
	copyRequiredFile(input.noticePath, join(wrapperDir, "NOTICE"));
	writeJson(join(wrapperDir, "package.json"), {
		name: "@shrinivas-sn/shri",
		version: input.version,
		repository: RELEASE_REPOSITORY,
		type: "commonjs",
		description: "Shri single-agent terminal preview",
		bin: { shri: "bin/shri.cjs" },
		engines: { node: ">=22.15.0" },
		files: ["bin", "NOTICE"],
		license: "Apache-2.0",
		publishConfig: { access: "public" },
		optionalDependencies,
	});
}

if (import.meta.main) {
	const cliDir = resolve(import.meta.dir, "..");
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: { target: { type: "string", multiple: true } },
		strict: true,
	});
	const packageJson = JSON.parse(
		readFileSync(join(cliDir, "package.json"), "utf8"),
	) as { version?: unknown };
	if (typeof packageJson.version !== "string") {
		throw new Error("apps/cli/package.json has no release version.");
	}
	const wrapperPath = join(cliDir, "bin", "shri.cjs");
	createReleasePackages({
		artifactsDir: join(cliDir, "dist"),
		outputDir: join(cliDir, "dist", "npm"),
		version: packageJson.version,
		readmePath: join(cliDir, "README.md"),
		licensePath: join(cliDir, "..", "..", "LICENSE"),
		wrapperPath,
		wrapperContents: existsSync(wrapperPath)
			? readFileSync(wrapperPath, "utf8")
			: "",
		caCertsPath: join(cliDir, "bin", "ca-certs.cjs"),
		noticePath: join(cliDir, "NOTICE"),
		targetIds: values.target,
	});
	console.log("Generated local Shri release packages in dist/npm.");
}
