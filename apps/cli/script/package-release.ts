#!/usr/bin/env bun

import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const RELEASE_TARGETS = [
	{
		os: "darwin",
		arch: "arm64",
		artifactDirectory: "cli-darwin-arm64",
		binaryName: "cline",
	},
	{
		os: "darwin",
		arch: "x64",
		artifactDirectory: "cli-darwin-x64",
		binaryName: "cline",
	},
	{
		os: "linux",
		arch: "arm64",
		artifactDirectory: "cli-linux-arm64",
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
		arch: "arm64",
		artifactDirectory: "cli-windows-arm64",
		binaryName: "cline.exe",
	},
	{
		os: "windows",
		arch: "x64",
		artifactDirectory: "cli-windows-x64",
		binaryName: "cline.exe",
	},
] as const;

type ReleaseTarget = (typeof RELEASE_TARGETS)[number];

export interface CreateReleasePackagesInput {
	artifactsDir: string;
	outputDir: string;
	version: string;
	readmePath: string;
	licensePath: string;
	wrapperPath: string;
	wrapperContents: string;
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
	if (!existsSync(source)) {
		throw new Error(`Missing required release file: ${source}`);
	}
	mkdirSync(dirname(destination), { recursive: true });
	copyFileSync(source, destination);
}

function platformPackageName(target: ReleaseTarget): string {
	return `@shrinivas-sn/shri-${target.os}-${target.arch}`;
}

export function createReleasePackages(
	input: CreateReleasePackagesInput,
): void {
	if (!existsSync(input.readmePath) || !existsSync(input.licensePath)) {
		throw new Error("Release packages require README.md and LICENSE.");
	}
	ensureWithin(input.outputDir, dirname(input.outputDir));
	rmSync(input.outputDir, { recursive: true, force: true });
	mkdirSync(input.outputDir, { recursive: true });

	const optionalDependencies: Record<string, string> = {};
	for (const target of RELEASE_TARGETS) {
		const sourceDir = join(input.artifactsDir, target.artifactDirectory);
		if (!existsSync(sourceDir)) {
			throw new Error(`Missing platform artifact: ${target.artifactDirectory}`);
		}
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
		writeJson(join(packageDir, "package.json"), {
			name: packageName,
			version: input.version,
			description: `Shri terminal executable for ${target.os} ${target.arch}`,
			license: "Apache-2.0",
			os: [target.os === "windows" ? "win32" : target.os],
			cpu: [target.arch],
			bin: { shri: `bin/${releaseBinaryName}` },
			files: ["bin", "extensions"],
		});
		optionalDependencies[packageName] = input.version;
	}

	const wrapperDir = join(input.outputDir, "shri");
	if (!input.wrapperContents.trim()) {
		throw new Error(`Missing release wrapper: ${input.wrapperPath}`);
	}
	mkdirSync(join(wrapperDir, "bin"), { recursive: true });
	writeFileSync(join(wrapperDir, "bin", "shri.cjs"), input.wrapperContents);
	copyRequiredFile(input.readmePath, join(wrapperDir, "README.md"));
	copyRequiredFile(input.licensePath, join(wrapperDir, "LICENSE"));
	writeJson(join(wrapperDir, "package.json"), {
		name: "@shrinivas-sn/shri",
		version: input.version,
		type: "commonjs",
		description: "Shri single-agent terminal preview",
		bin: { shri: "bin/shri.cjs" },
		engines: { node: ">=22.15.0" },
		files: ["bin"],
		license: "Apache-2.0",
		publishConfig: { access: "public" },
		optionalDependencies,
	});
}

if (import.meta.main) {
	const cliDir = resolve(import.meta.dir, "..");
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
	});
	console.log("Generated local Shri release packages in dist/npm.");
}
