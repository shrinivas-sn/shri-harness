import { spawnSync } from "node:child_process";
import {
	chmodSync,
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	writeFileSync,
} from "node:fs";
import { arch as hostArch, platform as hostPlatform, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceWrapperPath = fileURLToPath(
	new URL("../../bin/cline", import.meta.url),
);
const sourceShriWrapperPath = fileURLToPath(
	new URL("../../bin/shri.cjs", import.meta.url),
);
const sourceCaCertsPath = fileURLToPath(
	new URL("../../bin/ca-certs.cjs", import.meta.url),
);

function createWrapperCopy(): string {
	const dir = mkdtempSync(join(tmpdir(), "cline-bin-package-"));
	const binDir = join(dir, "bin");
	mkdirSync(binDir, { recursive: true });
	const wrapperPath = join(binDir, "cline");
	copyFileSync(sourceWrapperPath, wrapperPath);
	chmodSync(wrapperPath, 0o755);
	return wrapperPath;
}

/**
 * Copies bin/shri.cjs (and the ca-certs.cjs it requires via a relative path)
 * into <root>/bin/, mirroring how npm lays out the published wrapper
 * package: <root>/bin/shri.cjs + <root>/bin/ca-certs.cjs, with platform
 * packages hoisted to a sibling <root>/node_modules/.
 */
function createShriWrapperCopy(
	root = mkdtempSync(join(tmpdir(), "shri-bin-package-")),
): {
	root: string;
	wrapperPath: string;
} {
	const binDir = join(root, "bin");
	mkdirSync(binDir, { recursive: true });
	const wrapperPath = join(binDir, "shri.cjs");
	copyFileSync(sourceShriWrapperPath, wrapperPath);
	copyFileSync(sourceCaCertsPath, join(binDir, "ca-certs.cjs"));
	chmodSync(wrapperPath, 0o755);
	return { root, wrapperPath };
}

/** node:os platform names mapped the same way bin/shri.cjs maps them. */
function shriPlatformName(): string {
	const p = hostPlatform();
	if (p === "win32") return "windows";
	if (p === "darwin" || p === "linux") return p;
	return p;
}

/**
 * Creates a fake @shrinivas-sn/shri-<platform>-<arch>/bin/shri(.exe) at the
 * exact path bin/shri.cjs's findBinary() looks for, runnable by spawnSync
 * with no shell. On POSIX a shebang script works directly. Windows requires
 * a genuine PE executable at that path — spawnSync launches it via
 * CreateProcess, which validates the file format regardless of extension —
 * so this copies node.exe itself there and returns the argv prefix needed
 * to make that copy run `binaryContents` as a script (empty on POSIX, where
 * the shebang file already *is* the desired script).
 */
function createFakePlatformPackage(
	root: string,
	binaryContents: string,
): { binaryPath: string; argsPrefix: string[] } {
	const platformPkg = `@shrinivas-sn/shri-${shriPlatformName()}-${hostArch()}`;
	const pkgBinDir = join(root, "node_modules", platformPkg, "bin");
	mkdirSync(pkgBinDir, { recursive: true });
	if (hostPlatform() === "win32") {
		const binaryPath = join(pkgBinDir, "shri.exe");
		copyFileSync(process.execPath, binaryPath);
		const scriptDir = mkdtempSync(join(tmpdir(), "shri-fake-binary-"));
		const scriptPath = join(scriptDir, "fake-binary.js");
		writeFileSync(scriptPath, binaryContents);
		return { binaryPath, argsPrefix: [scriptPath] };
	}
	const binaryPath = join(pkgBinDir, "shri");
	writeFileSync(binaryPath, `#!/usr/bin/env node\n${binaryContents}`);
	chmodSync(binaryPath, 0o755);
	return { binaryPath, argsPrefix: [] };
}

/**
 * Writes a Node script and returns a `target` spawnSync can execute directly
 * (no `shell: true`, matching how the real wrappers spawn a compiled
 * binary), plus the `argsPrefix` needed to make that target actually run the
 * script: empty on POSIX, where a shebang `.js` file works as `target`
 * as-is. Windows doesn't interpret shebangs, and spawning a `.cmd` batch
 * file that shells out to `node` (even with an absolute node.exe path)
 * proved flaky when nested inside the vitest worker's own spawned process —
 * intermittent, non-reproducible-standalone failures, most likely real-time
 * antivirus scanning newly-written executables under contention. Copying
 * node.exe itself to `target` (a genuine, already-trusted PE binary — the
 * same technique createFakePlatformPackage uses, proven reliable) and
 * prefixing the script path as its first arg sidesteps batch dispatch
 * entirely and has shown no flakiness across repeated runs.
 */
function createExecutableScript(contents: string): {
	target: string;
	argsPrefix: string[];
} {
	const dir = mkdtempSync(join(tmpdir(), "cline-bin-wrapper-"));
	const scriptPath = join(dir, "child.js");
	writeFileSync(scriptPath, contents);
	if (process.platform === "win32") {
		const target = join(dir, "child.exe");
		copyFileSync(process.execPath, target);
		return { target, argsPrefix: [scriptPath] };
	}
	const shebangPath = join(dir, "child.sh.js");
	writeFileSync(shebangPath, `#!/usr/bin/env node\n${contents}`);
	chmodSync(shebangPath, 0o755);
	return { target: shebangPath, argsPrefix: [] };
}

function runWrapper(target: string, args: string[] = []) {
	const wrapperPath = createWrapperCopy();
	return spawnSync(process.execPath, [wrapperPath, ...args], {
		env: {
			...process.env,
			CLINE_BIN_PATH: target,
		},
		encoding: "utf8",
	});
}

describe("bin/cline wrapper", () => {
	it("preserves the child process exit status", () => {
		const { target, argsPrefix } = createExecutableScript(`
process.exit(Number(process.argv[2] ?? "0"));
`);

		const result = runWrapper(target, [...argsPrefix, "7"]);

		expect(result.error).toBeUndefined();
		expect(result.status).toBe(7);
		expect(result.signal).toBeNull();
	});

	it("passes the wrapper path to the compiled binary", () => {
		const { target, argsPrefix } = createExecutableScript(`
console.log(process.env.CLINE_WRAPPER_PATH ?? "");
`);

		const result = runWrapper(target, argsPrefix);

		expect(result.error).toBeUndefined();
		expect(result.status).toBe(0);
		expect(result.stdout.trim()).toMatch(/bin[/\\]cline$/);
	});

	it.skipIf(process.platform === "win32")(
		"propagates child process signal termination on POSIX",
		() => {
			const { target, argsPrefix } = createExecutableScript(`
process.kill(process.pid, "SIGTERM");
setTimeout(() => {}, 1000);
`);

			const result = runWrapper(target, argsPrefix);

			expect(result.error).toBeUndefined();
			expect(result.status).toBeNull();
			expect(result.signal).toBe("SIGTERM");
		},
	);
});

function runShriWrapper(
	root: string,
	args: string[] = [],
	extraEnv: Record<string, string> = {},
) {
	const { wrapperPath } = createShriWrapperCopy(root);
	return spawnSync(process.execPath, [wrapperPath, ...args], {
		env: { ...process.env, ...extraEnv },
		encoding: "utf8",
	});
}

describe("bin/shri.cjs wrapper", () => {
	it("preserves the child process exit status via SHRI_BIN_PATH override", () => {
		const { target, argsPrefix } = createExecutableScript(`
process.exit(Number(process.argv[2] ?? "0"));
`);
		const root = mkdtempSync(join(tmpdir(), "shri-bin-package-"));

		const result = runShriWrapper(root, [...argsPrefix, "7"], {
			SHRI_BIN_PATH: target,
		});

		expect(result.error).toBeUndefined();
		expect(result.status).toBe(7);
		expect(result.signal).toBeNull();
	});

	it("forwards argv to the resolved binary", () => {
		const { target, argsPrefix } = createExecutableScript(`
console.log(JSON.stringify(process.argv.slice(2)));
`);
		const root = mkdtempSync(join(tmpdir(), "shri-bin-package-"));

		const result = runShriWrapper(
			root,
			[...argsPrefix, "--foo", "bar baz", "こんにちは"],
			{ SHRI_BIN_PATH: target },
		);

		expect(result.error).toBeUndefined();
		expect(JSON.parse(result.stdout.trim())).toEqual([
			"--foo",
			"bar baz",
			"こんにちは",
		]);
	});

	it.skipIf(process.platform === "win32")(
		"propagates child process signal termination on POSIX",
		() => {
			const { target, argsPrefix } = createExecutableScript(`
process.kill(process.pid, "SIGTERM");
setTimeout(() => {}, 1000);
`);
			const root = mkdtempSync(join(tmpdir(), "shri-bin-package-"));

			const result = runShriWrapper(root, argsPrefix, {
				SHRI_BIN_PATH: target,
			});

			expect(result.error).toBeUndefined();
			expect(result.status).toBeNull();
			expect(result.signal).toBe("SIGTERM");
		},
	);

	it("resolves the platform-specific package by walking up node_modules", () => {
		const root = mkdtempSync(join(tmpdir(), "shri-bin-package-"));
		const { binaryPath, argsPrefix } = createFakePlatformPackage(
			root,
			`process.stdout.write("found:" + (process.argv[2] ?? ""));\nprocess.exit(0);`,
		);

		const result = runShriWrapper(root, [...argsPrefix, "ok"]);

		expect(result.error).toBeUndefined();
		expect(result.status).toBe(0);
		expect(result.stdout).toBe("found:ok");
		expect(binaryPath).toContain("bin");
	});

	it("resolves the platform package from a path containing spaces and non-ASCII characters", () => {
		const outerRoot = mkdtempSync(join(tmpdir(), "shri-bin-package-"));
		const root = join(outerRoot, "space dir", "日本語-café");
		mkdirSync(root, { recursive: true });
		const { argsPrefix } = createFakePlatformPackage(
			root,
			`process.stdout.write("ok");\nprocess.exit(0);`,
		);

		const result = runShriWrapper(root, argsPrefix);

		expect(result.error).toBeUndefined();
		expect(result.status).toBe(0);
		expect(result.stdout).toBe("ok");
	});

	it("exits 1 with an actionable message when no platform package is installed", () => {
		// Covers both "missing platform package" and "unsupported architecture":
		// both leave findBinary() unable to resolve anything, so both hit this
		// exact code path — there is no separate branch to distinguish them.
		const root = mkdtempSync(join(tmpdir(), "shri-bin-package-"));

		const result = runShriWrapper(root);

		expect(result.error).toBeUndefined();
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("Could not find the Shri binary");
		expect(result.stderr).toContain("npm install -g @shrinivas-sn/shri@next");
	});
});
