#!/usr/bin/env bun

import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
	basename,
	delimiter,
	dirname,
	isAbsolute,
	join,
	relative,
	resolve,
	sep,
} from "node:path";
import { parseArgs } from "node:util";
import { RELEASE_TARGETS } from "./package-release";

interface VerifiedPackage {
	package: string;
	version: string;
	target: string;
	tarball: string;
	size: number;
	sha256: string;
	checks: { id: string; pass: boolean }[];
}

function fail(id: string): never {
	throw new Error(`Installed release check failed: ${id}`);
}

function sha256(path: string): string {
	return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function run(
	command: string,
	args: string[],
	cwd: string,
	env: Record<string, string>,
): {
	status: number;
	stdout: string;
	stderr: string;
} {
	const result = Bun.spawnSync([command, ...args], {
		cwd,
		env,
		stdout: "pipe",
		stderr: "pipe",
	});
	return {
		status: result.exitCode,
		stdout: result.stdout.toString("utf8"),
		stderr: result.stderr.toString("utf8"),
	};
}

async function removeTemporary(path: string): Promise<void> {
	const parent = resolve(tmpdir());
	const rel = relative(parent, resolve(path));
	if (
		!rel ||
		rel === ".." ||
		rel.startsWith(`..${sep}`) ||
		isAbsolute(rel) ||
		!basename(path).startsWith("shri-installed-")
	) {
		throw new Error("Unsafe installed-smoke cleanup target");
	}
	for (let attempt = 0; ; attempt++) {
		try {
			rmSync(path, { recursive: true, force: true });
			return;
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			if (
				attempt === 5 ||
				(code !== "EACCES" &&
					code !== "EPERM" &&
					code !== "EBUSY" &&
					code !== "ENOTEMPTY")
			)
				throw error;
			await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
		}
	}
}

async function waitForProcessExit(
	pid: number,
	timeoutMs: number,
): Promise<boolean> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			process.kill(pid, 0);
		} catch {
			return true;
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	try {
		process.kill(pid, 0);
		return false;
	} catch {
		return true;
	}
}

function resolveTools(): { nodeDir: string; npm: string; npx: string } {
	const result = run(
		"node",
		["-p", "process.execPath"],
		process.cwd(),
		process.env as Record<string, string>,
	);
	if (result.status !== 0) fail("node-runtime");
	const nodeDir = dirname(result.stdout.trim());
	const suffix = process.platform === "win32" ? ".cmd" : "";
	const npm = join(nodeDir, `npm${suffix}`);
	const npx = join(nodeDir, `npx${suffix}`);
	if (!existsSync(npm) || !existsSync(npx)) fail("npm-tools");
	return {
		nodeDir,
		npm: process.platform === "win32" ? "npm.cmd" : npm,
		npx: process.platform === "win32" ? "npx.cmd" : npx,
	};
}

function isolatedEnv(root: string, nodeDir: string): Record<string, string> {
	const env: Record<string, string> = {};
	for (const [name, value] of Object.entries(process.env)) {
		if (
			value === undefined ||
			/KEY|TOKEN|SECRET|PASSWORD|AUTH|CREDENTIAL/i.test(name) ||
			/^(?:BUN_|NODE_PATH$|NODE_OPTIONS$|CLINE_|SHRI_|NPM_CONFIG_)/i.test(name)
		)
			continue;
		env[name] = value;
	}
	const home = join(root, "home");
	const appData = join(home, "AppData", "Roaming");
	const localAppData = join(home, "AppData", "Local");
	const temp = join(root, "temp");
	for (const path of [home, appData, localAppData, temp])
		mkdirSync(path, { recursive: true });
	const systemRoot = process.env.SystemRoot ?? "C:\\Windows";
	env.PATH =
		process.platform === "win32"
			? [nodeDir, join(systemRoot, "System32"), systemRoot].join(delimiter)
			: [nodeDir, "/usr/bin", "/bin"].join(delimiter);
	env.HOME = home;
	env.USERPROFILE = home;
	env.APPDATA = appData;
	env.LOCALAPPDATA = localAppData;
	env.TEMP = temp;
	env.TMP = temp;
	env.SHRI_DIR = join(home, ".shri");
	env.CLINE_DIR = join(home, ".cline");
	env.CLINE_TELEMETRY_DISABLED = "1";
	env.CLINE_NO_AUTO_UPDATE = "1";
	env.CLINE_DISABLE_CLINE_PASS_NOTICE = "1";
	env.npm_config_cache = join(root, "npm-cache");
	env.npm_config_userconfig = join(home, "missing-user-npmrc");
	env.npm_config_globalconfig = join(home, "missing-global-npmrc");
	env.npm_config_registry = "http://127.0.0.1:9/";
	env.CI = "1";
	return env;
}

function verifyTarball(reportDir: string, pkg: VerifiedPackage): string {
	if (pkg.checks.some((item) => !item.pass)) fail("verification-report-checks");
	const path = resolve(reportDir, pkg.tarball);
	const rel = relative(reportDir, path);
	if (
		!rel ||
		rel === ".." ||
		rel.startsWith(`..${sep}`) ||
		isAbsolute(rel) ||
		!path.endsWith(".tgz")
	)
		fail("tarball-path");
	if (!existsSync(path)) fail("tarball-missing");
	if (readFileSync(path).length !== pkg.size || sha256(path) !== pkg.sha256)
		fail("tarball-hash");
	return path;
}

export async function runInstalledSmoke(
	target: string,
	options: {
		pty?: boolean;
		authPty?: boolean;
		modelPty?: boolean;
		renderPty?: boolean;
		daemon?: boolean;
		providerFixture?: boolean;
	} = {},
): Promise<{
	target: string;
	version: string;
	checks: Record<string, boolean>;
}> {
	const cliDir = resolve(import.meta.dir, "..");
	const reportDir = join(cliDir, "dist", "npm");
	const report = JSON.parse(
		readFileSync(join(reportDir, "verification-report.json"), "utf8"),
	) as {
		packages: VerifiedPackage[];
	};
	const wrapper = report.packages.find((item) => item.target === "wrapper");
	const platform = report.packages.find((item) => item.target === target);
	if (
		!wrapper ||
		!platform ||
		wrapper.package !== "@shrinivas-sn/shri" ||
		platform.package !== `@shrinivas-sn/shri-${target}` ||
		wrapper.version !== platform.version
	)
		fail("report-contract");
	const wrapperTar = verifyTarball(reportDir, wrapper);
	const platformTar = verifyTarball(reportDir, platform);
	const tools = resolveTools();
	const root = mkdtempSync(join(tmpdir(), "shri-installed-"));
	try {
		const consumer = join(root, "consumer path ü");
		const prefix = join(consumer, "prefix");
		const unrelated = join(consumer, "unrelated workdir");
		mkdirSync(prefix, { recursive: true });
		mkdirSync(unrelated, { recursive: true });
		const env = isolatedEnv(root, tools.nodeDir);
		const sentinel = join(env.CLINE_DIR, "sentinel.txt");
		mkdirSync(env.CLINE_DIR, { recursive: true });
		writeFileSync(sentinel, "legacy state must stay unchanged\n");
		const legacyHubPath = join(
			env.CLINE_DIR,
			"data",
			"locks",
			"hub",
			"production.json",
		);
		mkdirSync(dirname(legacyHubPath), { recursive: true });
		const legacyHubRecord = `${JSON.stringify({
			hubId: "legacy-cline-test-only",
			protocolVersion: "1",
			authToken: "synthetic-test-only",
			host: "127.0.0.1",
			port: 9,
			url: "ws://127.0.0.1:9/",
			startedAt: "2020-01-01T00:00:00.000Z",
			updatedAt: "2020-01-01T00:00:00.000Z",
			coreVersion: "LEGACY_CLINE_DISCOVERY_TEST_ONLY",
		})}\n`;
		writeFileSync(legacyHubPath, legacyHubRecord);
		const checks: Record<string, boolean> = {
			hashes: true,
			noBunPath: !env.PATH.toLowerCase().includes("bun") && !env.BUN_EXEC_PATH,
		};
		if (!checks.noBunPath) fail("no-bun-path");
		const install = run(
			tools.npm,
			[
				"install",
				"--prefix",
				prefix,
				"--offline",
				"--ignore-scripts",
				"--no-audit",
				"--no-fund",
				"--no-save",
				"--package-lock=false",
				platformTar,
				wrapperTar,
			],
			unrelated,
			env,
		);
		checks.install = install.status === 0;
		if (!checks.install) {
			const code =
				install.stderr.match(/npm error code ([A-Z0-9_]+)/)?.[1] ?? "unknown";
			const detail = (install.stderr || install.stdout)
				.trim()
				.split(/\r?\n/)
				.slice(0, 3)
				.join(" | ")
				.replace(
					/gsk_[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]+/g,
					"[REDACTED]",
				)
				.slice(0, 300);
			fail(`npm-install-${code}${detail ? `: ${detail}` : ""}`);
		}
		const bin = join(
			prefix,
			"node_modules",
			".bin",
			process.platform === "win32" ? "shri.cmd" : "shri",
		);
		if (!existsSync(bin)) fail("npm-command-shim");
		const installedWrapper = join(
			prefix,
			"node_modules",
			"@shrinivas-sn",
			"shri",
		);
		const installedPlatform = join(
			prefix,
			"node_modules",
			"@shrinivas-sn",
			`shri-${target}`,
		);
		if (
			![installedWrapper, installedPlatform].every(
				(path) => existsSync(path) && realpathSync(path).startsWith(root + sep),
			)
		)
			fail("installed-package-location");
		const shimVersion = run(bin, ["--version"], unrelated, env);
		checks.shimVersion =
			shimVersion.status === 0 && shimVersion.stdout.trim() === wrapper.version;
		if (!checks.shimVersion) fail("shim-version");
		const npxVersion = run(
			tools.npx,
			["--prefix", prefix, "--offline", "--no", "shri", "version"],
			unrelated,
			env,
		);
		checks.npxVersion =
			npxVersion.status === 0 && npxVersion.stdout.trim() === wrapper.version;
		if (!checks.npxVersion) {
			const detail = (npxVersion.stderr || npxVersion.stdout)
				.trim()
				.split(/\r?\n/)
				.slice(0, 3)
				.join(" | ")
				.replace(
					/gsk_[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]+/g,
					"[REDACTED]",
				)
				.slice(0, 300);
			fail(`npx-version-${npxVersion.status}${detail ? `: ${detail}` : ""}`);
		}
		const help = run(bin, ["--help"], unrelated, env);
		checks.help = help.status === 0 && help.stdout.includes("Usage:");
		if (!checks.help) fail("help");
		const missingKey = run(bin, ["auth"], unrelated, env);
		checks.missingKey =
			missingKey.status === 1 &&
			missingKey.stderr.includes("No Groq API key found");
		if (!checks.missingKey) fail("missing-key");
		const syntheticKey = "gsk_SHRI_INSTALLED_SAVED_TEST_ONLY";
		const savedAuth = run(
			bin,
			["auth", "--apikey", syntheticKey],
			unrelated,
			env,
		);
		const settingsPath = join(
			env.SHRI_DIR,
			"data",
			"settings",
			"providers.json",
		);
		const savedSettings = existsSync(settingsPath)
			? (JSON.parse(readFileSync(settingsPath, "utf8")) as {
					providers?: {
						groq?: { settings?: { apiKey?: string; model?: string } };
					};
				})
			: undefined;
		checks.savedAuth =
			savedAuth.status === 0 &&
			savedSettings?.providers?.groq?.settings?.apiKey === syntheticKey &&
			savedSettings.providers.groq.settings.model === "openai/gpt-oss-120b" &&
			!savedAuth.stdout.includes(syntheticKey) &&
			!savedAuth.stderr.includes(syntheticKey);
		if (!checks.savedAuth) fail("saved-auth");
		const noOptionalPrefix = join(consumer, "without optional package");
		mkdirSync(noOptionalPrefix, { recursive: true });
		const noOptionalInstall = run(
			tools.npm,
			[
				"install",
				"--prefix",
				noOptionalPrefix,
				"--offline",
				"--ignore-scripts",
				"--omit=optional",
				"--no-audit",
				"--no-fund",
				"--no-save",
				"--package-lock=false",
				wrapperTar,
			],
			unrelated,
			env,
		);
		if (noOptionalInstall.status !== 0)
			fail("missing-platform-fixture-install");
		const noOptionalBin = join(
			noOptionalPrefix,
			"node_modules",
			".bin",
			process.platform === "win32" ? "shri.cmd" : "shri",
		);
		const noOptionalResult = run(noOptionalBin, ["--version"], unrelated, env);
		checks.missingPlatform =
			noOptionalResult.status === 1 &&
			noOptionalResult.stderr.includes(`@shrinivas-sn/shri-${target}`) &&
			noOptionalResult.stderr.includes("optional dependencies enabled") &&
			!existsSync(
				join(
					noOptionalPrefix,
					"node_modules",
					"@shrinivas-sn",
					`shri-${target}`,
				),
			);
		if (!checks.missingPlatform) fail("missing-platform");
		const hubStatusResult = run(bin, ["hub", "status"], unrelated, env);
		let hubStatus: { running?: boolean; coreVersion?: string } = {};
		try {
			hubStatus = JSON.parse(hubStatusResult.stdout);
		} catch {
			// An invalid status response fails this check without printing state.
		}
		checks.hubStatusIsolated =
			hubStatusResult.status === 0 &&
			hubStatus.running === false &&
			hubStatus.coreVersion !== "LEGACY_CLINE_DISCOVERY_TEST_ONLY" &&
			!hubStatusResult.stdout.includes("LEGACY_CLINE_DISCOVERY_TEST_ONLY") &&
			readFileSync(legacyHubPath, "utf8") === legacyHubRecord;
		if (!checks.hubStatusIsolated) fail("hub-status-isolation");
		if (options.pty) {
			const ptyResult = run(
				"node",
				[
					join(cliDir, "script", "smoke-installed-pty.mjs"),
					join(installedWrapper, "bin", "shri.cjs"),
					unrelated,
				],
				unrelated,
				{ ...env, GROQ_API_KEY: "gsk_SHRI_INSTALLED_TUI_TEST_ONLY" },
			);
			let ptyChecks: {
				startup?: boolean;
				survivesIdle?: boolean;
				shutdown?: boolean;
				ptyPid?: number;
				exitedAt?: string;
			} = {};
			try {
				ptyChecks = JSON.parse(ptyResult.stdout);
			} catch {
				// The helper reports only booleans, never terminal contents.
			}
			console.error(
				`Installed PTY before cleanup: ${JSON.stringify({
					exitCode: ptyResult.status,
					startup: ptyChecks.startup === true,
					idle: ptyChecks.survivesIdle === true,
					shutdown: ptyChecks.shutdown === true,
					ptyPid: ptyChecks.ptyPid,
					exitedAt: ptyChecks.exitedAt,
					helperError: ptyResult.stderr.trim().split(/\r?\n/)[0]?.slice(0, 150),
				})}`,
			);
			checks.tuiStartup = ptyResult.status === 0 && ptyChecks.startup === true;
			checks.tuiSurvivesIdle =
				ptyResult.status === 0 && ptyChecks.survivesIdle === true;
			checks.tuiShutdown =
				ptyResult.status === 0 && ptyChecks.shutdown === true;
			if (
				!checks.tuiStartup ||
				!checks.tuiSurvivesIdle ||
				!checks.tuiShutdown
			) {
				const diagnostic =
					ptyResult.stderr.trim().split(/\r?\n/)[0]?.slice(0, 150) ?? "";
				const failed = ["tuiStartup", "tuiSurvivesIdle", "tuiShutdown"]
					.filter((key) => checks[key] !== true)
					.join(",");
				fail(`tui-pty: ${failed}${diagnostic ? `: ${diagnostic}` : ""}`);
			}
			// The interactive runtime can prewarm a detached hub. It is intentionally
			// longer-lived than the TUI, so stop only this isolated test's hub before
			// deleting the installation that contains its executable.
			const discoveryPath = join(
				env.SHRI_DIR,
				"data",
				"locks",
				"hub",
				"production.json",
			);
			const discoveryPresent = existsSync(discoveryPath);
			console.error(
				`Installed PTY isolated hub discovery: ${discoveryPresent ? "present" : "none"}`,
			);
			if (discoveryPresent) {
				const discovery = JSON.parse(readFileSync(discoveryPath, "utf8")) as {
					pid?: number;
				};
				const pid = discovery.pid;
				if (!Number.isInteger(pid) || !pid || pid <= 0)
					fail("tui-hub-discovery-pid");
				const stopped = run(bin, ["hub", "stop"], unrelated, env);
				let stopResult: { stopped?: boolean } = {};
				try {
					stopResult = JSON.parse(stopped.stdout);
				} catch {
					// The explicit status check below reports a failed stop.
				}
				const exited = await waitForProcessExit(pid, 3_000);
				checks.tuiHubStopped =
					stopped.status === 0 &&
					stopResult.stopped === true &&
					exited &&
					!existsSync(discoveryPath);
				if (!checks.tuiHubStopped)
					fail(
						`tui-hub-stop: status=${stopped.status} stopped=${stopResult.stopped === true} exited=${exited} discovery=${existsSync(discoveryPath)}`,
					);
			} else {
				checks.tuiHubStopped = true;
			}
		}
		if (options.authPty) {
			const authResult = run(
				"node",
				[
					join(cliDir, "script", "smoke-installed-auth-pty.mjs"),
					join(installedWrapper, "bin", "shri.cjs"),
					unrelated,
					settingsPath,
				],
				unrelated,
				env,
			);
			let authChecks: { authReplace?: boolean; authCancel?: boolean } = {};
			try {
				authChecks = JSON.parse(authResult.stdout);
			} catch {
				// The helper reports only booleans, never terminal contents.
			}
			checks.authReplace =
				authResult.status === 0 && authChecks.authReplace === true;
			checks.authCancel =
				authResult.status === 0 && authChecks.authCancel === true;
			if (!checks.authReplace || !checks.authCancel) {
				const diagnostic =
					authResult.stderr.trim().split(/\r?\n/)[0]?.slice(0, 150) ?? "";
				fail(`auth-pty${diagnostic ? `: ${diagnostic}` : ""}`);
			}
		}
		if (options.modelPty) {
			const modelResult = run(
				"node",
				[
					join(cliDir, "script", "smoke-installed-model-pty.mjs"),
					join(
						installedPlatform,
						"bin",
						process.platform === "win32" ? "shri.exe" : "shri",
					),
					unrelated,
					settingsPath,
				],
				unrelated,
				env,
			);
			let modelChecks: {
				modelOpen?: boolean;
				transcriptionFiltered?: boolean;
				missingMetadataRendered?: boolean;
				localCatalogRequested?: boolean;
				fixtureTranscriptionFiltered?: boolean;
				modelSelected?: boolean;
				modelReopened?: boolean;
			} = {};
			try {
				modelChecks = JSON.parse(modelResult.stdout);
			} catch {
				// The PTY helper reports only boolean outcomes, never terminal contents.
			}
			for (const key of [
				"modelOpen",
				"transcriptionFiltered",
				"missingMetadataRendered",
				"localCatalogRequested",
				"fixtureTranscriptionFiltered",
				"modelSelected",
				"modelReopened",
			] as const) {
				checks[key] = modelResult.status === 0 && modelChecks[key] === true;
			}
			if (
				!checks.modelOpen ||
				!checks.transcriptionFiltered ||
				!checks.missingMetadataRendered ||
				!checks.localCatalogRequested ||
				!checks.fixtureTranscriptionFiltered ||
				!checks.modelSelected ||
				!checks.modelReopened
			) {
				const diagnostic = modelResult.stderr.trim().split(/\r?\n/)[0] ?? "";
				const failedChecks = Object.entries(modelChecks)
					.filter(([, value]) => value === false)
					.map(([key]) => key)
					.join(",");
				fail(
					`model-pty${diagnostic ? `: ${diagnostic.slice(0, 1_700)}` : `: status=${modelResult.status} failed=${failedChecks || "no-json"}`}`,
				);
			}
		}
		if (options.renderPty) {
			const renderResult = run(
				"node",
				[
					join(cliDir, "script", "smoke-installed-render-pty.mjs"),
					join(
						installedPlatform,
						"bin",
						process.platform === "win32" ? "shri.exe" : "shri",
					),
					unrelated,
					settingsPath,
				],
				unrelated,
				env,
			);
			let renderChecks: {
				markdownCodeRendered?: boolean;
				syntaxHighlighted?: boolean;
				shutdown?: boolean;
				ptyPid?: number;
				exitedAt?: string;
			} = {};
			try {
				renderChecks = JSON.parse(renderResult.stdout);
			} catch {
				// The helper reports booleans only.
			}
			console.error(
				`Installed render before cleanup: ${JSON.stringify({ exitCode: renderResult.status, markdown: renderChecks.markdownCodeRendered === true, syntax: renderChecks.syntaxHighlighted === true, shutdown: renderChecks.shutdown === true, ptyPid: renderChecks.ptyPid, exitedAt: renderChecks.exitedAt, helperError: renderResult.stderr.trim().split(/\r?\n/)[0]?.slice(0, 150) })}`,
			);
			const renderHubDiscoveryPath = join(
				env.SHRI_DIR,
				"data",
				"locks",
				"hub",
				"production.json",
			);
			let renderHubPid: number | undefined;
			try {
				renderHubPid = JSON.parse(
					readFileSync(renderHubDiscoveryPath, "utf8"),
				).pid;
			} catch {
				// No isolated hub discovery was written.
			}
			console.error(
				`Installed render isolated hub pid: ${Number.isInteger(renderHubPid) ? renderHubPid : "none"}`,
			);
			checks.markdownCodeRendered = renderChecks.markdownCodeRendered === true;
			checks.syntaxHighlighted = renderChecks.syntaxHighlighted === true;
			checks.renderShutdown = renderChecks.shutdown === true;
			if (
				renderResult.status !== 0 ||
				!checks.markdownCodeRendered ||
				!checks.syntaxHighlighted ||
				!checks.renderShutdown
			) {
				const diagnostic = renderResult.stderr.trim().split(/\r?\n/)[0] ?? "";
				fail(
					`render-pty${diagnostic ? `: ${diagnostic.slice(0, 160)}` : `: ${JSON.stringify(renderChecks)}`}`,
				);
			}
		}
		if (options.daemon) {
			const daemonResult = run(
				"node",
				[
					join(cliDir, "script", "smoke-installed-daemon.mjs"),
					join(
						installedPlatform,
						"bin",
						process.platform === "win32" ? "shri.exe" : "shri",
					),
					unrelated,
					env.SHRI_DIR,
					legacyHubPath,
				],
				unrelated,
				env,
			);
			let daemonChecks: {
				daemonStarted?: boolean;
				daemonStateIsolated?: boolean;
				daemonStopped?: boolean;
			} = {};
			try {
				daemonChecks = JSON.parse(daemonResult.stdout);
			} catch {
				// The helper reports boolean outcomes only.
			}
			console.error(
				`Installed daemon before cleanup: ${JSON.stringify({ exitCode: daemonResult.status, started: daemonChecks.daemonStarted === true, isolated: daemonChecks.daemonStateIsolated === true, stopped: daemonChecks.daemonStopped === true, helperError: daemonResult.stderr.trim().split(/\r?\n/)[0]?.slice(0, 150) })}`,
			);
			checks.daemonStarted = daemonChecks.daemonStarted === true;
			checks.daemonStateIsolated = daemonChecks.daemonStateIsolated === true;
			checks.daemonStopped = daemonChecks.daemonStopped === true;
			if (
				daemonResult.status !== 0 ||
				!checks.daemonStarted ||
				!checks.daemonStateIsolated ||
				!checks.daemonStopped
			) {
				const diagnostic = daemonResult.stderr.trim().split(/\r?\n/)[0] ?? "";
				fail(
					`daemon${diagnostic ? `: ${diagnostic.slice(0, 160)}` : `: ${JSON.stringify(daemonChecks)}`}`,
				);
			}
		}
		if (options.providerFixture) {
			const fixtureResult = run(
				"node",
				[
					join(cliDir, "script", "smoke-installed-provider-fixture.mjs"),
					join(
						installedPlatform,
						"bin",
						process.platform === "win32" ? "shri.exe" : "shri",
					),
					unrelated,
					settingsPath,
				],
				unrelated,
				env,
			);
			let fixtureChecks: {
				keyPrecedence?: boolean;
				temporaryKeysNotPersisted?: boolean;
				readFileTool?: boolean;
				commandTool?: boolean;
				invalidAuth?: boolean;
				transientRecovery?: boolean;
				interruptedStream?: boolean;
				historyRestart?: boolean;
				cases?: Record<string, boolean>[];
				toolStep?: number;
				toolResultSeen?: boolean;
			} = {};
			try {
				fixtureChecks = JSON.parse(fixtureResult.stdout);
			} catch {
				// The helper reports only booleans, never request or terminal contents.
			}
			checks.keyPrecedence = fixtureChecks.keyPrecedence === true;
			checks.temporaryKeysNotPersisted =
				fixtureChecks.temporaryKeysNotPersisted === true;
			checks.readFileTool = fixtureChecks.readFileTool === true;
			checks.commandTool = fixtureChecks.commandTool === true;
			checks.invalidAuth = fixtureChecks.invalidAuth === true;
			checks.transientRecovery = fixtureChecks.transientRecovery === true;
			checks.interruptedStream = fixtureChecks.interruptedStream === true;
			checks.historyRestart = fixtureChecks.historyRestart === true;
			checks.sessionStoreIsolated =
				checks.historyRestart &&
				existsSync(join(env.SHRI_DIR, "data", "db", "sessions.db")) &&
				!existsSync(join(env.CLINE_DIR, "data", "db", "sessions.db"));
			if (
				fixtureResult.status !== 0 ||
				!checks.keyPrecedence ||
				!checks.temporaryKeysNotPersisted ||
				!checks.readFileTool ||
				!checks.commandTool ||
				!checks.invalidAuth ||
				!checks.transientRecovery ||
				!checks.interruptedStream ||
				!checks.historyRestart ||
				!checks.sessionStoreIsolated
			) {
				const diagnostic = fixtureResult.stderr.trim().split(/\r?\n/)[0] ?? "";
				fail(
					`provider-fixture${diagnostic ? `: ${diagnostic.slice(0, 120)}` : ""}${fixtureChecks.cases ? `: ${JSON.stringify({ cases: fixtureChecks.cases, toolStep: fixtureChecks.toolStep, toolResultSeen: fixtureChecks.toolResultSeen })}` : ""}`,
				);
			}
		}
		checks.stateIsolation =
			readFileSync(sentinel, "utf8") === "legacy state must stay unchanged\n" &&
			readFileSync(legacyHubPath, "utf8") === legacyHubRecord &&
			readdirSync(env.CLINE_DIR).sort().join(",") === "data,sentinel.txt" &&
			existsSync(env.SHRI_DIR);
		if (!checks.stateIsolation) fail("state-isolation");
		return { target, version: wrapper.version, checks };
	} finally {
		await removeTemporary(root);
	}
}

if (import.meta.main) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			target: { type: "string" },
			pty: { type: "boolean" },
			"auth-pty": { type: "boolean" },
			"model-pty": { type: "boolean" },
			"render-pty": { type: "boolean" },
			daemon: { type: "boolean" },
			"provider-fixture": { type: "boolean" },
		},
		strict: true,
	});
	const hostTarget = `${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`;
	const target = values.target ?? hostTarget;
	try {
		if (
			target !== hostTarget ||
			!RELEASE_TARGETS.some((item) => `${item.os}-${item.arch}` === target)
		)
			fail("unsupported-host-target");
		console.log(
			JSON.stringify(
				await runInstalledSmoke(target, {
					pty: values.pty,
					authPty: values["auth-pty"],
					modelPty: values["model-pty"],
					renderPty: values["render-pty"],
					daemon: values.daemon,
					providerFixture: values["provider-fixture"],
				}),
			),
		);
	} catch (error) {
		console.error(
			error instanceof Error ? error.message : "Installed smoke failed",
		);
		process.exitCode = 1;
	}
}
