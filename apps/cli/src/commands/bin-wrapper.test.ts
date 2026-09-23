import { spawnSync } from "node:child_process";
import {
	chmodSync,
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const sourceWrapperPath = fileURLToPath(
	new URL("../../bin/shri.cjs", import.meta.url),
);
const tempDirs: string[] = [];

function writeCurrentPlatformManifest(root: string): void {
	const packageName = `@shrinivas-sn/shri-${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`;
	writeFileSync(
		join(root, "package.json"),
		JSON.stringify({
			name: "@shrinivas-sn/shri",
			version: "0.1.0-next.0",
			optionalDependencies: { [packageName]: "0.1.0-next.0" },
		}),
	);
}

function createWrapperCopy(prefix = "cline-bin-package-"): string {
	const dir = mkdtempSync(join(tmpdir(), prefix));
	tempDirs.push(dir);
	const binDir = join(dir, "bin");
	mkdirSync(binDir, { recursive: true });
	const wrapperPath = join(binDir, "shri.cjs");
	copyFileSync(sourceWrapperPath, wrapperPath);
	chmodSync(wrapperPath, 0o755);
	return wrapperPath;
}

function createExecutableScript(
	contents: string,
	prefix = "cline-bin-wrapper-",
): string {
	const dir = mkdtempSync(join(tmpdir(), prefix));
	tempDirs.push(dir);
	const scriptPath = join(dir, "child.js");
	writeFileSync(scriptPath, `#!/usr/bin/env node\n${contents}`);
	chmodSync(scriptPath, 0o755);
	return scriptPath;
}

function runWrapper(target: string, args: string[] = []) {
	const wrapperPath = createWrapperCopy();
	return spawnSync(process.execPath, [wrapperPath, ...args], {
		env: {
			...process.env,
			SHRI_BIN_PATH: target,
		},
		encoding: "utf8",
	});
}

describe("bin/shri.cjs wrapper", () => {
	afterEach(() => {
		for (const dir of tempDirs.splice(0)) {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("uses the wrapper manifest to decide which platforms this release supports", () => {
		const wrapperPath = createWrapperCopy();
		writeFileSync(
			join(wrapperPath, "..", "..", "package.json"),
			JSON.stringify({
				name: "@shrinivas-sn/shri",
				version: "0.1.0-next.0",
				optionalDependencies: {
					"@shrinivas-sn/shri-windows-x64": "0.1.0-next.0",
				},
			}),
		);
		const result = spawnSync(
			process.execPath,
			[
				"-e",
				"const wrapper = require(process.argv[1]); console.log(JSON.stringify([wrapper.platformPackageName('win32', 'x64'), wrapper.platformPackageName('linux', 'x64'), wrapper.platformPackageName('darwin', 'arm64')]));",
				wrapperPath,
			],
			{ encoding: "utf8", env: { ...process.env, SHRI_BIN_PATH: "" } },
		);
		expect(result.status).toBe(0);
		expect(JSON.parse(result.stdout.trim())).toEqual([
			"@shrinivas-sn/shri-windows-x64",
			null,
			null,
		]);
	});

	it("resolves an installed platform package without a repository path", () => {
		const wrapperPath = createWrapperCopy();
		writeCurrentPlatformManifest(join(wrapperPath, "..", ".."));
		const packageRoot = join(
			wrapperPath,
			"..",
			"..",
			"node_modules",
			"@shrinivas-sn",
			`shri-${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`,
		);
		mkdirSync(join(packageRoot, "bin"), { recursive: true });
		writeFileSync(
			join(packageRoot, "package.json"),
			JSON.stringify({
				name: `@shrinivas-sn/shri-${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`,
				version: "0.1.0-next.0",
			}),
		);
		const binaryPath = join(
			packageRoot,
			"bin",
			process.platform === "win32" ? "shri.exe" : "shri",
		);
		writeFileSync(binaryPath, "fixture executable");
		const result = spawnSync(
			process.execPath,
			[
				"-e",
				"const wrapper = require(process.argv[1]); console.log(wrapper.resolveBinary(process.platform, process.arch));",
				wrapperPath,
			],
			{ encoding: "utf8", env: { ...process.env, SHRI_BIN_PATH: "" } },
		);
		expect(result.status).toBe(0);
		expect(result.stdout.trim()).toBe(binaryPath);
	});

	it("resolves a locally linked npm package from its install location", () => {
		const wrapperSource = createWrapperCopy();
		const wrapperRoot = join(wrapperSource, "..", "..");
		writeCurrentPlatformManifest(wrapperRoot);
		const consumer = mkdtempSync(join(tmpdir(), "shri-linked-consumer-"));
		tempDirs.push(consumer);
		const scopeRoot = join(consumer, "node_modules", "@shrinivas-sn");
		mkdirSync(scopeRoot, { recursive: true });
		const installedWrapper = join(scopeRoot, "shri");
		symlinkSync(wrapperRoot, installedWrapper, "junction");
		const platformRoot = join(
			scopeRoot,
			`shri-${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`,
		);
		mkdirSync(join(platformRoot, "bin"), { recursive: true });
		writeFileSync(
			join(platformRoot, "package.json"),
			JSON.stringify({
				name: `@shrinivas-sn/shri-${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`,
				version: "0.1.0-next.0",
			}),
		);
		const binaryPath = join(
			platformRoot,
			"bin",
			process.platform === "win32" ? "shri.exe" : "shri",
		);
		writeFileSync(binaryPath, "fixture executable");
		const result = spawnSync(
			process.execPath,
			[
				"-e",
				"const wrapper = require(process.argv[1]); console.log(wrapper.resolveBinary(process.platform, process.arch));",
				join(installedWrapper, "bin", "shri.cjs"),
			],
			{ encoding: "utf8", env: { ...process.env, SHRI_BIN_PATH: "" } },
		);
		expect(result.status).toBe(0);
		expect(result.stdout.trim()).toBe(binaryPath);
	});

	it("rejects a platform package with a different version", () => {
		const wrapperPath = createWrapperCopy();
		const wrapperRoot = join(wrapperPath, "..", "..");
		writeCurrentPlatformManifest(wrapperRoot);
		const packageRoot = join(
			wrapperRoot,
			"node_modules",
			"@shrinivas-sn",
			`shri-${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`,
		);
		mkdirSync(join(packageRoot, "bin"), { recursive: true });
		writeFileSync(
			join(packageRoot, "package.json"),
			JSON.stringify({
				name: `@shrinivas-sn/shri-${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`,
				version: "0.0.0",
			}),
		);
		writeFileSync(
			join(
				packageRoot,
				"bin",
				process.platform === "win32" ? "shri.exe" : "shri",
			),
			"fixture executable",
		);
		const result = spawnSync(
			process.execPath,
			[
				"-e",
				"const wrapper = require(process.argv[1]); console.log(wrapper.resolveBinary(process.platform, process.arch) ?? 'missing');",
				wrapperPath,
			],
			{ encoding: "utf8", env: { ...process.env, SHRI_BIN_PATH: "" } },
		);
		expect(result.status).toBe(0);
		expect(result.stdout.trim()).toBe("missing");
	});

	it("prefers the matching sibling platform package over a stale nested copy", () => {
		const fixtureRoot = mkdtempSync(join(tmpdir(), "shri-sibling-test-"));
		tempDirs.push(fixtureRoot);
		const wrapperRoot = join(fixtureRoot, "shri");
		const wrapperPath = join(wrapperRoot, "bin", "shri.cjs");
		mkdirSync(join(wrapperRoot, "bin"), { recursive: true });
		copyFileSync(sourceWrapperPath, wrapperPath);
		const packageName = `@shrinivas-sn/shri-${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`;
		const binaryName = process.platform === "win32" ? "shri.exe" : "shri";
		writeCurrentPlatformManifest(wrapperRoot);
		const sibling = join(wrapperRoot, "..", packageName.split("/")[1]);
		const nested = join(
			wrapperRoot,
			"node_modules",
			"@shrinivas-sn",
			packageName.split("/")[1],
		);
		for (const [packageDir, version] of [
			[sibling, "0.1.0-next.0"],
			[nested, "0.0.0"],
		]) {
			mkdirSync(join(packageDir, "bin"), { recursive: true });
			writeFileSync(
				join(packageDir, "package.json"),
				JSON.stringify({ name: packageName, version }),
			);
			writeFileSync(join(packageDir, "bin", binaryName), "fixture executable");
		}
		const result = spawnSync(
			process.execPath,
			[
				"-e",
				"const wrapper = require(process.argv[1]); console.log(wrapper.resolveBinary(process.platform, process.arch) ?? 'missing');",
				wrapperPath,
			],
			{ encoding: "utf8", env: { ...process.env, SHRI_BIN_PATH: "" } },
		);
		expect(result.status).toBe(0);
		expect(result.stdout.trim()).toBe(join(sibling, "bin", binaryName));
	});

	it("distinguishes unsupported architectures from a missing optional package", () => {
		const wrapperPath = createWrapperCopy();
		const result = spawnSync(
			process.execPath,
			[
				"-e",
				"const wrapper = require(process.argv[1]); console.log(wrapper.resolveBinary('win32', 'ia32') ?? 'unsupported');",
				wrapperPath,
			],
			{ encoding: "utf8", env: { ...process.env, SHRI_BIN_PATH: "" } },
		);
		expect(result.status).toBe(0);
		expect(result.stdout.trim()).toBe("unsupported");
	});

	it("falls back to Shri state for a blank --config even with inherited Cline state", () => {
		const wrapperPath = createWrapperCopy();
		const result = spawnSync(
			process.execPath,
			[
				"-e",
				"const wrapper = require(process.argv[1]); console.log(wrapper.resolveShriDir(['--config', ''], { SHRI_DIR: 'shri-choice', CLINE_DIR: 'cline-choice' }));",
				wrapperPath,
			],
			{ encoding: "utf8" },
		);
		expect(result.status).toBe(0);
		expect(result.stdout.trim()).toBe("shri-choice");
	});

	it("forwards Unicode arguments and custom Shri state with Node alone", () => {
		const target = createExecutableScript(
			`
console.log(JSON.stringify({ args: process.argv.slice(2), state: process.env.SHRI_DIR, wrapper: process.env.SHRI_WRAPPER_PATH }));
`,
			"shri child 日本語 ",
		);
		const stateDir = mkdtempSync(join(tmpdir(), "shri state 日本語 "));
		tempDirs.push(stateDir);
		const wrapperPath = createWrapperCopy("shri wrapper 日本語 ");
		const result = spawnSync(
			process.execPath,
			[wrapperPath, "--config", stateDir, "नमस्ते"],
			{
				env: {
					...process.env,
					SHRI_BIN_PATH: target,
					SHRI_DIR: stateDir,
					PATH: "",
				},
				encoding: "utf8",
			},
		);
		expect(result.status).toBe(0);
		const output = JSON.parse(result.stdout.trim());
		expect(output.args).toEqual(["--config", stateDir, "नमस्ते"]);
		expect(output.state).toBe(stateDir);
		expect(output.wrapper).toBe(wrapperPath);
	});
	it("preserves the child process exit status", () => {
		const target = createExecutableScript(`
process.exit(Number(process.argv[2] ?? "0"));
`);

		const result = runWrapper(target, ["7"]);

		expect(result.error).toBeUndefined();
		expect(result.stderr).toBe("");
		expect(result.status).toBe(7);
		expect(result.signal).toBeNull();
	});

	it("forwards standard input and output through the launcher", () => {
		const target = createExecutableScript(`
const fs = require("node:fs");
process.stdout.write(fs.readFileSync(0, "utf8").toUpperCase());
`);
		const wrapperPath = createWrapperCopy();
		const result = spawnSync(process.execPath, [wrapperPath], {
			env: { ...process.env, SHRI_BIN_PATH: target },
			input: "hello Shri\n",
			encoding: "utf8",
		});
		expect(result.status).toBe(0);
		expect(result.stdout).toBe("HELLO SHRI\n");
	});

	it("explains when the matching optional platform package is absent", () => {
		const wrapperPath = createWrapperCopy();
		writeCurrentPlatformManifest(join(wrapperPath, "..", ".."));
		const result = spawnSync(process.execPath, [wrapperPath, "--version"], {
			env: { ...process.env, SHRI_BIN_PATH: "" },
			encoding: "utf8",
		});
		expect(result.status).toBe(1);
		expect(result.stderr).toContain(
			`@shrinivas-sn/shri-${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`,
		);
	});

	it("passes the wrapper path to the compiled binary", () => {
		const target = createExecutableScript(`
console.log(process.env.SHRI_WRAPPER_PATH ?? "");
`);

		const result = runWrapper(target);

		expect(result.error).toBeUndefined();
		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
		expect(result.stdout.trim()).toMatch(/bin[/\\]shri\.cjs$/);
	});

	it.skipIf(process.platform === "win32")(
		"propagates child process signal termination on POSIX",
		() => {
			const target = createExecutableScript(`
process.kill(process.pid, "SIGTERM");
setTimeout(() => {}, 1000);
`);

			const result = runWrapper(target);

			expect(result.error).toBeUndefined();
			expect(result.status).toBeNull();
			expect(result.signal).toBe("SIGTERM");
		},
	);
});
