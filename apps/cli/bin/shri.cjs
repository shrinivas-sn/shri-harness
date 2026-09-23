#!/usr/bin/env node

const childProcess = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function platformPackageName(platform = process.platform, arch = process.arch) {
	const displayPlatform = platform === "win32" ? "windows" : platform;
	const target = `${displayPlatform}-${arch}`;
	const packageName = `@shrinivas-sn/shri-${target}`;
	try {
		const root = path.dirname(path.dirname(wrapperPath()));
		const manifest = JSON.parse(
			fs.readFileSync(path.join(root, "package.json"), "utf8"),
		);
		return manifest.name === "@shrinivas-sn/shri" &&
			manifest.optionalDependencies?.[packageName] === manifest.version
			? packageName
			: undefined;
	} catch {
		return undefined;
	}
}

function wrapperPath() {
	const invoked = process.argv[1] && path.resolve(process.argv[1]);
	if (invoked) {
		try {
			const manifest = path.join(
				path.dirname(path.dirname(invoked)),
				"package.json",
			);
			if (
				JSON.parse(fs.readFileSync(manifest, "utf8")).name ===
				"@shrinivas-sn/shri"
			) {
				return invoked;
			}
		} catch {
			// A global bin link can point outside the installed package.
		}
	}
	return fs.realpathSync(__filename);
}

function resolveBinary(platform = process.platform, arch = process.arch) {
	if (process.env.SHRI_BIN_PATH) return process.env.SHRI_BIN_PATH;
	const packageName = platformPackageName(platform, arch);
	if (!packageName) return undefined;
	const root = path.dirname(path.dirname(wrapperPath()));
	const binary = platform === "win32" ? "shri.exe" : "shri";
	const manifests = [
		path.join(root, "..", packageName.split("/")[1], "package.json"),
	];
	try {
		manifests.push(
			require.resolve(`${packageName}/package.json`, {
				paths: [root],
			}),
		);
	} catch {
		// A local npm link may not participate in Node's package resolution.
	}
	try {
		const wrapperManifest = JSON.parse(
			fs.readFileSync(path.join(root, "package.json"), "utf8"),
		);
		if (wrapperManifest.name !== "@shrinivas-sn/shri") return undefined;
		for (const manifest of manifests) {
			try {
				const platformManifest = JSON.parse(fs.readFileSync(manifest, "utf8"));
				if (
					platformManifest.name !== packageName ||
					platformManifest.version !== wrapperManifest.version
				)
					continue;
				const candidate = path.join(path.dirname(manifest), "bin", binary);
				if (fs.statSync(candidate).isFile()) return candidate;
			} catch {
				// Try the next package-manager layout.
			}
		}
		return undefined;
	} catch {
		return undefined;
	}
}

function resolveShriDir(args, env = process.env) {
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--config") {
			const value = args[i + 1]?.trim();
			if (value) return value;
		}
		if (arg.startsWith("--config=")) {
			const value = arg.slice("--config=".length).trim();
			if (value) return value;
		}
	}
	return env.SHRI_DIR?.trim() || path.join(os.homedir(), ".shri");
}

function run() {
	const scriptPath = wrapperPath();
	const args = process.argv.slice(2);
	const stateDir = resolveShriDir(args);
	const childEnv = {
		...process.env,
		SHRI_WRAPPER_PATH: scriptPath,
		// The embedded SDK uses this convention to find sibling assets.
		CLINE_WRAPPER_PATH: scriptPath,
	};
	try {
		const caCerts = require("./ca-certs.cjs");
		caCerts.configureNodeExtraCaCerts(childEnv, {
			stateDir,
			bundleName: "shri-node-extra-ca-certs.pem",
		});
	} catch {
		// Fall back to the runtime's default trust if OS CA discovery fails.
	}
	const binary = resolveBinary();
	if (!binary) {
		const packageName = platformPackageName();
		console.error(
			packageName
				? `Shri's ${packageName} executable is missing. Reinstall @shrinivas-sn/shri with optional dependencies enabled.`
				: `Shri does not support ${process.platform} ${process.arch} in this preview.`,
		);
		return 1;
	}
	const isNodeScript = /\.(?:c|m)?js$/i.test(binary);
	const child = childProcess.spawnSync(
		isNodeScript ? process.execPath : binary,
		isNodeScript ? [binary, ...args] : args,
		{ stdio: "inherit", env: childEnv },
	);
	if (child.error) {
		console.error(child.error.message);
		return 1;
	}
	if (typeof child.status === "number") return child.status;
	if (child.signal) process.kill(process.pid, child.signal);
	return 1;
}

module.exports = { platformPackageName, resolveBinary, resolveShriDir };

if (require.main === module) process.exit(run());
