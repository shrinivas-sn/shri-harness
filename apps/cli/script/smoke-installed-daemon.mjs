import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [binaryPath, workingDirectory, shriDir, legacyHubPath] =
	process.argv.slice(2);
if (!binaryPath || !workingDirectory || !shriDir || !legacyHubPath) {
	console.error("Installed daemon fixture input missing");
	process.exit(2);
}

const discoveryPath = join(shriDir, "data", "locks", "hub", "production.json");
const daemonLogPath = join(shriDir, "data", "logs", "hub-daemon.log");
const legacyBefore = readFileSync(legacyHubPath, "utf8");
const startedAfter = Date.now() - 30_000;

function runCli(args, timeoutMs = 20_000) {
	return new Promise((resolve) => {
		const child = spawn(binaryPath, args, {
			cwd: workingDirectory,
			env: process.env,
			stdio: ["ignore", "pipe", "pipe"],
			windowsHide: true,
		});
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		let settled = false;
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill();
		}, timeoutMs);
		const finish = (code) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			resolve({ code, stdout, stderr, timedOut });
		};
		child.stdout.on("data", (chunk) => {
			stdout = (stdout + chunk.toString()).slice(-8_192);
		});
		child.stderr.on("data", (chunk) => {
			stderr = (stderr + chunk.toString()).slice(-8_192);
		});
		child.once("error", () => finish(-1));
		child.once("close", (code) => finish(code));
	});
}

function readDiscovery() {
	try {
		return JSON.parse(readFileSync(discoveryPath, "utf8"));
	} catch {
		return undefined;
	}
}

function isAlive(pid) {
	if (!Number.isInteger(pid) || pid <= 0) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

async function waitForExit(pid, timeoutMs) {
	const deadline = Date.now() + timeoutMs;
	while (isAlive(pid) && Date.now() < deadline)
		await new Promise((resolve) => setTimeout(resolve, 100));
	return !isAlive(pid);
}

let stage = "start";
let ownedPid;
let daemonStarted = false;
let daemonStateIsolated = false;
let daemonStopped = false;
try {
	const started = await runCli([
		"hub",
		"--host",
		"127.0.0.1",
		"--port",
		"0",
		"start",
	]);
	const discovery = readDiscovery();
	const discoveredAt = Date.parse(discovery?.startedAt ?? "");
	const freshDiscovery =
		Number.isFinite(discoveredAt) && discoveredAt >= startedAfter;
	if (freshDiscovery && Number.isInteger(discovery.pid) && discovery.pid > 0)
		ownedPid = discovery.pid;
	stage = "status";
	const status = await runCli(["hub", "status"]);
	let statusValue = {};
	try {
		statusValue = JSON.parse(status.stdout);
	} catch {
		// Invalid status is a failed check, without printing its body.
	}
	daemonStarted =
		started.code === 0 &&
		!started.timedOut &&
		status.code === 0 &&
		statusValue.running === true &&
		ownedPid !== undefined &&
		statusValue.pid === ownedPid &&
		discovery.host === "127.0.0.1" &&
		discovery.port > 0 &&
		String(discovery.url).includes(`127.0.0.1:${discovery.port}`);
	daemonStateIsolated =
		daemonStarted &&
		existsSync(discoveryPath) &&
		existsSync(daemonLogPath) &&
		readFileSync(legacyHubPath, "utf8") === legacyBefore;
} catch (error) {
	console.error(
		`Installed daemon fixture failed at ${stage}: ${error?.code ?? error?.name ?? "unknown"}`,
	);
} finally {
	stage = "stop";
	const stopped = await runCli(["hub", "stop"], 15_000);
	let stopValue = {};
	try {
		stopValue = JSON.parse(stopped.stdout);
	} catch {
		// The exit/discovery checks below still determine cleanup safety.
	}
	let exited = ownedPid === undefined || (await waitForExit(ownedPid, 3_000));
	if (!exited && ownedPid !== undefined) {
		// Only the PID from a discovery file created in this fresh test root.
		process.kill(ownedPid);
		exited = await waitForExit(ownedPid, 3_000);
	}
	daemonStopped =
		stopped.code === 0 &&
		stopValue.stopped === true &&
		exited &&
		!existsSync(discoveryPath) &&
		readFileSync(legacyHubPath, "utf8") === legacyBefore;
	console.log(
		JSON.stringify({ daemonStarted, daemonStateIsolated, daemonStopped }),
	);
	if (!daemonStarted || !daemonStateIsolated || !daemonStopped)
		process.exitCode = 1;
}
