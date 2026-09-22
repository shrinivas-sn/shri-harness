#!/usr/bin/env bun

import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { $ } from "bun";
import {
	parseBuildOptions,
	shouldBuildHubWebview,
	shouldInstallNativeVariants,
	validateBuildOptions,
} from "./build-options";

const cliDir = resolve(import.meta.dir, "..");
const rootDir = resolve(cliDir, "../..");
process.chdir(cliDir);

// Telemetry / OTEL environment variables that should be baked into the
// compiled binary at build time. Mirrors the list of secrets injected by the
// `cli-publish` GitHub Actions workflow. These are inlined via Bun's `define`
// so the CLI ships with the production telemetry configuration without
// requiring the end user to set any env vars.
const BUILD_TIME_INLINED_ENV_VARS = [
	"TELEMETRY_SERVICE_API_KEY",
	"ERROR_SERVICE_API_KEY",
	"OTEL_TELEMETRY_ENABLED",
	"OTEL_LOGS_EXPORTER",
	"OTEL_METRICS_EXPORTER",
	"OTEL_TRACES_EXPORTER",
	"CLINE_TRACE_SAMPLE_PERCENT",
	"CLINE_TRACE_RECORD_CONTENT",
	"OTEL_EXPORTER_OTLP_PROTOCOL",
	"OTEL_EXPORTER_OTLP_ENDPOINT",
	"OTEL_EXPORTER_OTLP_HEADERS",
] as const;

function buildInlinedEnvDefines(): Record<string, string> {
	const defines: Record<string, string> = {};
	for (const name of BUILD_TIME_INLINED_ENV_VARS) {
		defines[`process.env.${name}`] = JSON.stringify(process.env[name] ?? "");
	}
	return defines;
}

const pkg = JSON.parse(readFileSync(join(cliDir, "package.json"), "utf-8"));
const version: string = pkg.version;
const repository: unknown = pkg.repository;

console.log(`Building @cline/cli v${version}`);

const buildOptions = parseBuildOptions(process.argv.slice(2));

const allTargets: {
	os: string;
	arch: "arm64" | "x64";
}[] = [
	{ os: "linux", arch: "arm64" },
	{ os: "linux", arch: "x64" },
	{ os: "darwin", arch: "arm64" },
	{ os: "darwin", arch: "x64" },
	{ os: "win32", arch: "x64" },
	{ os: "win32", arch: "arm64" },
];

const targets = buildOptions.single
	? allTargets.filter(
			(item) => item.os === process.platform && item.arch === process.arch,
		)
	: allTargets;

const opentuiVersion = pkg.dependencies["@opentui/core"];
const optionsError = validateBuildOptions({
	options: buildOptions,
	opentuiVersion,
	targetCount: targets.length,
});
if (optionsError) {
	console.error(optionsError);
	process.exit(1);
}

await $`rm -rf dist`;

// Pre-install all platform variants of native packages so cross-compilation
// can resolve them. Without this, Bun only has the host platform's native
// binary and cross-compiled builds fail to resolve @opentui/core's FFI layer.
if (shouldInstallNativeVariants({ options: buildOptions, opentuiVersion })) {
	console.log(
		`Installing all platform variants of @opentui/core@${opentuiVersion}...`,
	);
	await $`bun install --os="*" --cpu="*" @opentui/core@${opentuiVersion}`;
}

// Build only the SDK packages the terminal CLI actually depends on
// (@cline/shared <- @cline/llms <- @cline/agents <- @cline/core), not the
// repo-wide `build:sdk` (`-F './sdk/packages/*'`). That wildcard also builds
// @cline/ui, used only by the hub dashboard webview (never by the terminal
// CLI) and not wired into a workspace @cline/cli depends on — a break in
// @cline/ui's own build (pre-existing, unrelated to this build) would
// otherwise abort every terminal build for a package it never needed.
if (!buildOptions.skipSdkBuild) {
	console.log("Building SDK packages...");
	await $`bun --production -F @cline/shared -F @cline/llms -F @cline/agents -F @cline/core build`.cwd(
		rootDir,
	);

	console.log("Building CLI bundle...");
	const cliBuildArgs = buildOptions.withHubWebview
		? ["--with-hub-webview"]
		: [];
	await $`bun -F @cline/cli build -- ${cliBuildArgs}`.cwd(rootDir);
}

const hubWebviewDist = join(cliDir, "../cline-hub/dist/webview");

// See build-options.ts's BuildOptions.withHubWebview doc comment: the hub
// dashboard webview is opt-in only, never a silent default. The CLI bundle
// step above already built it (or not) via the same flag; this second
// build is only reached if that step was skipped (--skip-sdk-build) but
// the webview is still explicitly wanted for this compiled-binary run.
if (shouldBuildHubWebview(buildOptions) && !existsSync(hubWebviewDist)) {
	console.log("Building Cline Hub webview...");
	await $`bun -F @cline/cline-hub build:webview`.cwd(rootDir);
}

const binaries: Record<string, string> = {};

function findOpenTuiParserWorker(): string {
	const localPath = resolve(
		cliDir,
		"node_modules/@opentui/core/parser.worker.js",
	);
	const rootPath = resolve(
		rootDir,
		"node_modules/@opentui/core/parser.worker.js",
	);
	const parserWorkerPath = existsSync(localPath) ? localPath : rootPath;
	return realpathSync(parserWorkerPath);
}

function getBunTarget(
	item: (typeof allTargets)[number],
): Bun.Build.CompileTarget {
	const targetOs = item.os === "win32" ? "windows" : item.os;
	return `bun-${targetOs}-${item.arch}` as Bun.Build.CompileTarget;
}

async function buildCompiledBinary(input: {
	bunTarget: Bun.Build.CompileTarget;
	dirName: string;
	outfile: string;
}): Promise<void> {
	const parserWorker = findOpenTuiParserWorker();
	const targetOs = input.bunTarget.includes("windows") ? "windows" : "posix";
	const bunfsRoot = targetOs === "windows" ? "B:/~BUN/root/" : "/$bunfs/root/";
	const parserWorkerPath = relative(rootDir, parserWorker).replaceAll(
		"\\",
		"/",
	);

	// Build to a scoped staging directory under the OS temp root first, so
	// Bun's temp-file rename stays on one filesystem layer in containerized
	// environments (virtiofs, overlayfs). The literal path "/tmp" is not a
	// real directory on Windows (join("/tmp", ...) resolves drive-relative,
	// e.g. to E:\tmp when cwd is on E:, and isn't guaranteed to exist) —
	// os.tmpdir() resolves the actual platform temp root everywhere.
	const entrypoint = join(cliDir, "src/index.ts");
	const tmpDir = join(tmpdir(), `cline-build-${input.dirName}`);
	const tmpOutfile = join(
		tmpDir,
		input.outfile.endsWith(".exe") ? "cline.exe" : "cline",
	);
	mkdirSync(tmpDir, { recursive: true });

	process.chdir(tmpDir);
	const result = await Bun.build({
		entrypoints: [entrypoint, parserWorker],
		splitting: true,
		compile: {
			target: input.bunTarget,
			outfile: tmpOutfile,
		},
		minify: true,
		// @sap-ai-sdk/foundation-models: see bun.mts's external list for why
		// this optional, dynamically-imported provider SDK is excluded.
		external: ["@anthropic-ai/vertex-sdk", "@sap-ai-sdk/foundation-models"],
		define: {
			OTUI_TREE_SITTER_WORKER_PATH: bunfsRoot + parserWorkerPath,
			// Inline telemetry/OTEL env vars at build time so the compiled
			// binary ships with production telemetry configuration baked in.
			...buildInlinedEnvDefines(),
		},
		throw: false,
	});
	process.chdir(cliDir);

	if (!result.success) {
		console.error(`Build failed for ${input.dirName}:`);
		for (const log of result.logs) {
			console.error(log);
		}
		process.exit(1);
	}

	await $`cp ${tmpOutfile} ${input.outfile} && chmod 755 ${input.outfile}`;
	await $`rm -rf ${tmpDir}`;
}

for (const item of targets) {
	// npm treats "win32" specially in os field, but for package naming use "windows"
	const displayOs = item.os === "win32" ? "windows" : item.os;
	const name = `@cline/cli-${displayOs}-${item.arch}`;
	const dirName = `cli-${displayOs}-${item.arch}`;
	const binaryName = item.os === "win32" ? "cline.exe" : "cline";
	const bunTarget = getBunTarget(item);

	console.log(`\nBuilding ${name} (target: ${bunTarget})...`);
	const outDir = join(cliDir, `dist/${dirName}/bin`);
	mkdirSync(outDir, { recursive: true });

	const outfile = join(outDir, binaryName);

	await buildCompiledBinary({ bunTarget, dirName, outfile });

	// Smoke test: only run on current platform
	if (item.os === process.platform && item.arch === process.arch) {
		console.log(`  Smoke test: ${outfile} --version`);
		try {
			const output = await $`${outfile} --version`.text();
			const actualVersion = output.trim();
			if (actualVersion !== version) {
				throw new Error(
					`Expected --version to print ${version}, got ${actualVersion}`,
				);
			}
			console.log(`  Passed: ${actualVersion}`);
		} catch (e) {
			console.error(`  Smoke test FAILED for ${name}:`, e);
			process.exit(1);
		}
	}

	// Copy plugin sandbox bootstrap if it exists
	const bootstrapSrc = join(
		rootDir,
		"sdk/packages/core/dist/extensions/plugin-sandbox-bootstrap.js",
	);
	if (existsSync(bootstrapSrc)) {
		const bootstrapDir = join(cliDir, `dist/${dirName}/extensions`);
		mkdirSync(bootstrapDir, { recursive: true });
		const content = readFileSync(bootstrapSrc);
		await Bun.write(join(bootstrapDir, "plugin-sandbox-bootstrap.js"), content);
	}

	if (existsSync(hubWebviewDist)) {
		const hubWebviewDest = join(cliDir, `dist/${dirName}/cline-hub/webview`);
		mkdirSync(join(cliDir, `dist/${dirName}/cline-hub`), {
			recursive: true,
		});
		cpSync(hubWebviewDist, hubWebviewDest, { recursive: true });
	}

	// Generate platform package.json
	await Bun.write(
		join(cliDir, `dist/${dirName}/package.json`),
		`${JSON.stringify(
			{
				name,
				version,
				description: `Cline CLI binary for ${displayOs} ${item.arch}`,
				os: [item.os],
				cpu: [item.arch],
				...(repository ? { repository } : {}),
				bin: {
					cline: `bin/${binaryName}`,
				},
			},
			null,
			2,
		)}\n`,
	);

	binaries[name] = version;
	console.log(`  Built ${name}`);
}

console.log(`\nBuild complete. ${Object.keys(binaries).length} targets built.`);
console.log("Packages:");
for (const [name, ver] of Object.entries(binaries)) {
	console.log(`  ${name}@${ver}`);
}

export { binaries, version };
