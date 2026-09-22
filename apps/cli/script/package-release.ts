#!/usr/bin/env bun

// Generates the public npm packages for the Shri preview release, from the
// compiled binaries script/build.ts already produced under apps/cli/dist/.
//
// This script only writes local files under apps/cli/dist/npm/. It never
// runs `npm publish`, `npm view`, or any other registry-touching command —
// generation and publication are deliberately separate (PLAN.md Task 3).
//
// Usage (from apps/cli):
//   bun run package:release

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

// -- Pure, testable logic --------------------------------------------------

export const RELEASE_VERSION = "0.1.0-next.0";
export const WRAPPER_PACKAGE_NAME = "@shrinivas-sn/shri";
export const NODE_ENGINE_RANGE = ">=22.15.0";

export interface ReleaseTarget {
	os: "linux" | "darwin" | "win32";
	arch: "arm64" | "x64";
}

// Every platform this preview could ever ship, mirroring script/build.ts's
// allTargets. Which of these actually get packaged this run depends on
// which have a compiled binary present in dist/ — see findBuiltTargets().
export const RELEASE_TARGETS: readonly ReleaseTarget[] = [
	{ os: "linux", arch: "arm64" },
	{ os: "linux", arch: "x64" },
	{ os: "darwin", arch: "arm64" },
	{ os: "darwin", arch: "x64" },
	{ os: "win32", arch: "x64" },
	{ os: "win32", arch: "arm64" },
];

/** npm's os field spelling; script/build.ts's dist/cli-<dirOs>-<arch> dirs use this too. */
export function targetDisplayOs(target: ReleaseTarget): string {
	return target.os === "win32" ? "windows" : target.os;
}

export function targetBuildDirName(target: ReleaseTarget): string {
	return `cli-${targetDisplayOs(target)}-${target.arch}`;
}

export function targetPlatformPackageName(target: ReleaseTarget): string {
	return `@shrinivas-sn/shri-${targetDisplayOs(target)}-${target.arch}`;
}

export function targetBinaryName(target: ReleaseTarget): string {
	return target.os === "win32" ? "shri.exe" : "shri";
}

/** The compiled binary's name as script/build.ts actually wrote it (internal @cline/cli-* naming; see PLAN.md Task 1's "retain internal name" note). */
export function targetBuiltBinaryName(target: ReleaseTarget): string {
	return target.os === "win32" ? "cline.exe" : "cline";
}

export interface RepositoryMetadata {
	type: string;
	url: string;
	directory?: string;
}

export interface PlatformPackageJsonInput {
	target: ReleaseTarget;
	version: string;
	repository?: RepositoryMetadata;
}

export function buildPlatformPackageJson(input: PlatformPackageJsonInput) {
	return {
		name: targetPlatformPackageName(input.target),
		version: input.version,
		description: `Shri CLI compiled binary for ${targetDisplayOs(input.target)} ${input.target.arch}`,
		os: [input.target.os],
		cpu: [input.target.arch],
		...(input.repository ? { repository: input.repository } : {}),
		bin: {
			shri: `bin/${targetBinaryName(input.target)}`,
		},
		license: "Apache-2.0",
	};
}

export interface WrapperPackageJsonInput {
	version: string;
	platformPackageNames: readonly string[];
	repository?: RepositoryMetadata;
	description?: string;
}

/**
 * Matches PLAN.md Task 3's wrapper manifest contract exactly. No
 * `dependencies` field: this wrapper only ever requires the platform
 * optionalDependencies (resolved by bin/shri.cjs at launch) plus Node
 * itself — never `workspace:*` or any inherited upstream SDK package, which
 * would leak the internal monorepo layout into a public install.
 */
export function buildWrapperPackageJson(input: WrapperPackageJsonInput) {
	const optionalDependencies = Object.fromEntries(
		[...input.platformPackageNames].sort().map((name) => [name, input.version]),
	);
	return {
		name: WRAPPER_PACKAGE_NAME,
		version: input.version,
		description: input.description || "Shri: terminal-first AI agent CLI",
		type: "commonjs",
		bin: { shri: "bin/shri.cjs" },
		engines: { node: NODE_ENGINE_RANGE },
		files: ["bin"],
		license: "Apache-2.0",
		...(input.repository ? { repository: input.repository } : {}),
		optionalDependencies,
		publishConfig: { access: "public" },
	};
}

/** Rejects any dependency value that would leak the internal monorepo layout into a public package. */
export function findWorkspaceDependencyLeaks(
	pkg: Record<string, unknown>,
): string[] {
	const leaks: string[] = [];
	for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
		const deps = pkg[field];
		if (deps && typeof deps === "object") {
			for (const [name, spec] of Object.entries(
				deps as Record<string, unknown>,
			)) {
				if (typeof spec === "string" && spec.startsWith("workspace:")) {
					leaks.push(`${field}.${name}=${spec}`);
				}
			}
		}
	}
	return leaks;
}

export interface FoundTarget {
	target: ReleaseTarget;
	builtBinaryPath: string;
}

export interface MissingTarget {
	target: ReleaseTarget;
	expectedBinaryPath: string;
}

/**
 * sdk/packages/core/src/extensions/plugin/plugin-sandbox.ts's
 * resolveBootstrapFromExecutable() looks for this file at
 * <installed-platform-package>/extensions/plugin-sandbox-bootstrap.js — a
 * sibling of bin/, resolved from process.execPath (package-name-agnostic,
 * so it still finds it after the @cline/cli-* -> @shrinivas-sn/shri-*
 * rename). Without it, plugin sandboxing has no bootstrap to run.
 */
export function targetBootstrapSourcePath(
	distDir: string,
	target: ReleaseTarget,
): string {
	return join(
		distDir,
		targetBuildDirName(target),
		"extensions",
		"plugin-sandbox-bootstrap.js",
	);
}

/**
 * Checks each of RELEASE_TARGETS against dist/cli-<os>-<arch>/bin/<binary>
 * (an explicit, known list — never a directory scan, so a stray or
 * partially-written dist/ entry can't silently become a published target).
 */
export function findBuiltTargets(
	distDir: string,
	targets: readonly ReleaseTarget[] = RELEASE_TARGETS,
	exists: (path: string) => boolean = existsSync,
): { found: FoundTarget[]; missing: MissingTarget[] } {
	const found: FoundTarget[] = [];
	const missing: MissingTarget[] = [];
	for (const target of targets) {
		const binaryPath = join(
			distDir,
			targetBuildDirName(target),
			"bin",
			targetBuiltBinaryName(target),
		);
		if (exists(binaryPath)) {
			found.push({ target, builtBinaryPath: binaryPath });
		} else {
			missing.push({ target, expectedBinaryPath: binaryPath });
		}
	}
	return { found, missing };
}

// -- Script body ------------------------------------------------------------

if (import.meta.main) {
	const cliDir = join(import.meta.dir, "..");
	const distDir = join(cliDir, "dist");
	const npmDir = join(distDir, "npm");

	// No repository field yet: apps/cli/package.json's still points at
	// upstream github.com/cline/cline, and PLAN.md Task 6 explicitly gates
	// confirming *this* repo's destination ("do not invent ownership, URL or
	// an existing remote") on work not yet done (git remote -v is still
	// empty). Carrying the upstream URL through here would misattribute the
	// published package's source until Task 6 sets the real one.
	const repository: RepositoryMetadata | undefined = undefined;

	const { found, missing } = findBuiltTargets(distDir);

	if (found.length === 0) {
		console.error("No compiled binaries found in dist/.");
		console.error(
			"Run `bun run build:platforms` or `bun run build:platforms:single` first.",
		);
		process.exit(1);
	}

	console.log(`Generating @shrinivas-sn/shri@${RELEASE_VERSION} packages...`);
	console.log(
		`  Found: ${found.map((f) => targetPlatformPackageName(f.target)).join(", ")}`,
	);
	if (missing.length > 0) {
		console.log(
			`  Not built (skipped, not silently included): ${missing
				.map((m) => targetPlatformPackageName(m.target))
				.join(", ")}`,
		);
	}

	rmSync(npmDir, { recursive: true, force: true });
	mkdirSync(npmDir, { recursive: true });

	// One directory per built platform: apps/cli/dist/npm/shri-<os>-<arch>/
	const platformPackageNames: string[] = [];
	for (const { target, builtBinaryPath } of found) {
		const pkgName = targetPlatformPackageName(target);
		const dirName = pkgName.replace("@shrinivas-sn/", "");
		const pkgDir = join(npmDir, dirName);
		const binDir = join(pkgDir, "bin");
		mkdirSync(binDir, { recursive: true });
		cpSync(builtBinaryPath, join(binDir, targetBinaryName(target)));

		const bootstrapSourcePath = targetBootstrapSourcePath(distDir, target);
		if (existsSync(bootstrapSourcePath)) {
			const extensionsDir = join(pkgDir, "extensions");
			mkdirSync(extensionsDir, { recursive: true });
			cpSync(
				bootstrapSourcePath,
				join(extensionsDir, "plugin-sandbox-bootstrap.js"),
			);
		} else {
			console.error(
				`Missing ${bootstrapSourcePath}: plugin sandboxing would have no bootstrap to run. Refusing to generate ${pkgName}.`,
			);
			process.exit(1);
		}

		const platformPkgJson = buildPlatformPackageJson({
			target,
			version: RELEASE_VERSION,
			repository,
		});
		const leaks = findWorkspaceDependencyLeaks(platformPkgJson);
		if (leaks.length > 0) {
			console.error(
				`Refusing to generate ${pkgName}: workspace dependency leak(s): ${leaks.join(", ")}`,
			);
			process.exit(1);
		}
		Bun.write(
			join(pkgDir, "package.json"),
			`${JSON.stringify(platformPkgJson, null, 2)}\n`,
		);

		const licensePath = join(cliDir, "../../LICENSE");
		if (existsSync(licensePath)) {
			cpSync(licensePath, join(pkgDir, "LICENSE"));
		}

		platformPackageNames.push(pkgName);
	}

	// The wrapper package: apps/cli/dist/npm/shri/
	const wrapperDir = join(npmDir, "shri");
	const wrapperBinDir = join(wrapperDir, "bin");
	mkdirSync(wrapperBinDir, { recursive: true });
	// Only bin/shri.cjs + bin/ca-certs.cjs: no postinstall (PLAN.md Task 3 —
	// "Omit inherited postinstall entirely; resolve binaries at launch"), and
	// no bin/cline (the upstream launcher) or bin/.cline cache convention.
	cpSync(join(cliDir, "bin/shri.cjs"), join(wrapperBinDir, "shri.cjs"));
	cpSync(join(cliDir, "bin/ca-certs.cjs"), join(wrapperBinDir, "ca-certs.cjs"));

	const wrapperPkgJson = buildWrapperPackageJson({
		version: RELEASE_VERSION,
		platformPackageNames,
		repository,
		// Not sourcePkg.description: apps/cli/package.json's description is
		// still upstream Cline's generic text. This preview is single-agent,
		// Groq-first — matches the framing established in README.md.
		description:
			"Shri: single-agent preview of a terminal-first AI coding CLI, Groq-first.",
	});
	const wrapperLeaks = findWorkspaceDependencyLeaks(wrapperPkgJson);
	if (wrapperLeaks.length > 0) {
		console.error(
			`Refusing to generate wrapper package: workspace dependency leak(s): ${wrapperLeaks.join(", ")}`,
		);
		process.exit(1);
	}
	Bun.write(
		join(wrapperDir, "package.json"),
		`${JSON.stringify(wrapperPkgJson, null, 2)}\n`,
	);

	const readmePath = join(cliDir, "README.md");
	if (!existsSync(readmePath)) {
		console.error(
			`Missing ${readmePath}. The CLI README must exist before generating a release.`,
		);
		process.exit(1);
	}
	cpSync(readmePath, join(wrapperDir, "README.md"));

	const licensePath = join(cliDir, "../../LICENSE");
	if (existsSync(licensePath)) {
		cpSync(licensePath, join(wrapperDir, "LICENSE"));
	}

	console.log(`\nGenerated ${1 + found.length} package(s) under ${npmDir}:`);
	console.log(`  ${WRAPPER_PACKAGE_NAME}@${RELEASE_VERSION}`);
	for (const name of platformPackageNames) {
		console.log(`  ${name}@${RELEASE_VERSION}`);
	}
	console.log(
		"\nNo files were published. Publication is a separate, explicit step.",
	);
}
