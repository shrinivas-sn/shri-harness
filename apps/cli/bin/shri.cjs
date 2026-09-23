#!/usr/bin/env node

const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const scriptPath = fs.realpathSync(__filename);
const childEnv = {
	...process.env,
	SHRI_WRAPPER_PATH: scriptPath,
	// The embedded runtime still uses this SDK convention to locate its
	// sibling plugin bootstrap. It points to Shri's wrapper, never Cline state.
	CLINE_WRAPPER_PATH: scriptPath,
};

function platformPackageName() {
	const platform = os.platform() === "win32" ? "windows" : os.platform();
	return `@shrinivas-sn/shri-${platform}-${os.arch()}`;
}

function resolveBinary() {
	if (process.env.SHRI_BIN_PATH) {
		return process.env.SHRI_BIN_PATH;
	}
	const packageName = platformPackageName();
	try {
		const manifest = require.resolve(`${packageName}/package.json`, {
			paths: [path.dirname(scriptPath)],
		});
		const binary = os.platform() === "win32" ? "shri.exe" : "shri";
		const candidate = path.join(path.dirname(manifest), "bin", binary);
		return fs.existsSync(candidate) ? candidate : undefined;
	} catch {
		return undefined;
	}
}

const binary = resolveBinary();
if (!binary) {
	console.error(
		`Shri does not provide a binary for ${os.platform()} ${os.arch()}. ` +
			"Install the matching optional @shrinivas-sn/shri platform package.",
	);
	process.exit(1);
}

const isNodeScript = /\.(?:c|m)?js$/i.test(binary);
const child = childProcess.spawnSync(
	isNodeScript ? process.execPath : binary,
	isNodeScript ? [binary, ...process.argv.slice(2)] : process.argv.slice(2),
	{
	stdio: "inherit",
	env: childEnv,
	},
);
if (child.error) {
	console.error(child.error.message);
	process.exit(1);
}
if (typeof child.status === "number") {
	process.exit(child.status);
}
if (child.signal) {
	process.kill(process.pid, child.signal);
}
process.exit(1);
