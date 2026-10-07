import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { launchTerminal } from "tuistory";

// Live Groq acceptance (PLAN Task 12.2) for an installed candidate. The key
// arrives only through GROQ_API_KEY in this process's environment; it is never
// written to settings, arguments, stdout or stderr. Each turn asks for a unique
// uppercase marker the prompt itself does not contain.
const [binaryPath, workingDirectory, settingsPath] = process.argv.slice(2);
if (!binaryPath || !workingDirectory || !settingsPath)
	throw new Error("Live PTY input missing");
const liveKey = process.env.GROQ_API_KEY ?? "";
if (!/^gsk_\S{20,}$/.test(liveKey)) throw new Error("Live key missing");

const READY = "What can I do for you?";
const TURN_TIMEOUT = 90_000;
const fixtureName = "live-fixture.txt";
const startModel = "openai/gpt-oss-120b";
// Display name in the picker, expected wire ID, and the turn's marker digit.
const switches = [
	{ name: "Llama 3.1 8B", id: "llama-3.1-8b-instant", digit: 5 },
	{ name: "Llama 3.3 70B", id: "llama-3.3-70b-versatile", digit: 9 },
	{ name: "GPT OSS 20B", id: "openai/gpt-oss-20b", digit: 6 },
	{ name: "Qwen3.8 27B", id: "qwen/qwen3.8-27b", digit: 7 },
	// Plan issue 6: does Groq accept reasoning_effort for Safeguard?
	{ name: "Safety GPT OSS 20B", id: "openai/gpt-oss-safeguard-20b", digit: 8 },
];

let session;
let stage = "setup";

function redact(text) {
	return String(text)
		.split(liveKey)
		.join("[REDACTED]")
		.replace(/gsk_[A-Za-z0-9_-]+/g, "[REDACTED]")
		.replace(/org_[A-Za-z0-9]+/g, "org_[REDACTED]")
		.replace(/\s+/g, " ");
}

function savedModel() {
	return JSON.parse(readFileSync(settingsPath, "utf8")).providers.groq.settings
		.model;
}

async function launch(args) {
	return await launchTerminal({
		command: binaryPath,
		args,
		cwd: workingDirectory,
		env: { ...process.env, CI: undefined, VITEST: undefined },
		cols: 120,
		rows: 40,
		waitForDataTimeout: 20_000,
	});
}

async function typeEchoed(text, echo = text) {
	await session.type(text);
	await session.waitForText(echo, { timeout: 5_000 });
}

/** Last error line on screen, if any, for the record. */
async function visibleError() {
	const screen = await session.text();
	const index = screen.lastIndexOf("Error:");
	return index === -1 ? undefined : redact(screen.slice(index, index + 200));
}

/** Sends one prompt and waits for its marker; returns ok/error/no-marker. */
async function turn(prompt, marker) {
	stage = `turn ${marker}`;
	const errorBefore = await visibleError();
	// Long prompts wrap in the input box, so check only their start.
	await typeEchoed(prompt, prompt.slice(0, 40));
	await session.press("enter");
	try {
		await session.waitForText(marker, { timeout: TURN_TIMEOUT });
		await waitForSettled();
		return { marker, outcome: "ok" };
	} catch {
		const error = await visibleError();
		if (!error || error === errorBefore)
			return { marker, outcome: "no-marker" };
		// Account quotas (tokens per minute, rate limits) are not Shri defects.
		const accountLimit = /tokens per minute|rate limit|Request too large/i.test(
			error,
		);
		return { marker, outcome: accountLimit ? "account-limit" : "error", error };
	}
}

/** A visible reply can precede the end of the turn; wait for a still screen. */
async function waitForSettled(quietMs = 2_000, timeout = 30_000) {
	const deadline = Date.now() + timeout;
	let previous = await session.text();
	let quietSince = Date.now();
	while (Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 200));
		const current = await session.text();
		if (current !== previous) {
			previous = current;
			quietSince = Date.now();
		} else if (Date.now() - quietSince >= quietMs) return;
	}
}

const DIALOG_TEXT = [
	"Select Model",
	"Thinking Level for",
	"Applying model",
	"Loading models",
];

async function waitForPrompt(timeout = 30_000) {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		const screen = await session.text();
		if (
			(screen.includes("Ask anything") || screen.includes(READY)) &&
			!DIALOG_TEXT.some((text) => screen.includes(text))
		)
			return;
		await new Promise((resolve) => setTimeout(resolve, 150));
	}
	throw new Error("prompt did not return");
}

/** Opens /model, picks `name`, accepts the default thinking level if asked. */
async function selectModel(name) {
	stage = `select ${name}`;
	await typeEchoed("/model", "Switch model or provider");
	await session.press("enter");
	await session.waitForText("Select Model", { timeout: 30_000 });
	const deadline = Date.now() + 30_000;
	while ((await session.text()).includes("Loading")) {
		if (Date.now() > deadline) throw new Error("loading overlay stayed open");
		await new Promise((resolve) => setTimeout(resolve, 150));
	}
	await session.type(name);
	// The search box echoes the name, so a listed model shows it twice.
	const listedDeadline = Date.now() + 10_000;
	let listed = false;
	while (!listed && Date.now() < listedDeadline) {
		listed = (await session.text()).split(name).length - 1 >= 2;
		if (!listed) await new Promise((resolve) => setTimeout(resolve, 200));
	}
	if (!listed) {
		await session.press("escape");
		await waitForPrompt();
		return false;
	}
	await session.press("enter");
	const thinkingDeadline = Date.now() + 5_000;
	while (Date.now() < thinkingDeadline) {
		if ((await session.text()).includes("Thinking Level for")) {
			await session.press("enter");
			break;
		}
		await new Promise((resolve) => setTimeout(resolve, 150));
	}
	await waitForPrompt();
	return true;
}

async function quit() {
	await session.press(["ctrl", "c"]);
	await session.press(["ctrl", "c"]);
	return await session.waitForExit(10_000);
}

function sessionIds() {
	const outcome = spawnSync(binaryPath, ["history", "--json"], {
		cwd: workingDirectory,
		env: process.env,
		encoding: "utf8",
		timeout: 20_000,
	});
	try {
		return JSON.parse(outcome.stdout).map((row) => row.sessionId);
	} catch {
		return [];
	}
}

const report = { startModel, turns: [], switches: [] };
try {
	const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
	const groq = settings.providers.groq.settings;
	delete groq.baseUrl;
	delete groq.reasoning;
	groq.model = startModel;
	writeFileSync(settingsPath, JSON.stringify(settings));
	writeFileSync(
		join(workingDirectory, fixtureName),
		"The code word is mango.\n",
	);
	const before = sessionIds();

	stage = "launch";
	session = await launch(["--provider", "groq", "-m", startModel]);
	await session.waitForText(READY, { timeout: 30_000 });
	report.turns.push(
		await turn(
			"Remember the secret word papaya. Reply with the word ready in uppercase, immediately followed by the digit 1, and nothing else.",
			"READY1",
		),
	);
	report.turns.push(
		await turn(
			"What secret word did I ask you to remember? Reply with that word in uppercase, immediately followed by the digit 2, and nothing else.",
			"PAPAYA2",
		),
	);
	report.turns.push(
		await turn(
			`Use the read_files tool on the file ${join(workingDirectory, fixtureName)} and reply with the code word inside it in uppercase, immediately followed by the digit 3, and nothing else.`,
			"MANGO3",
		),
	);
	stage = "quit";
	report.firstExited = await quit();
	session.close();

	stage = "resume";
	const sessionId = sessionIds().find((id) => !before.includes(id));
	report.resumeFound = Boolean(sessionId);
	if (sessionId) {
		session = await launch(["--id", sessionId]);
		// The restored transcript must render before the prompt is usable.
		await session.waitForText("Ask anything", { timeout: 30_000 });
		await waitForSettled();
		report.resumeShowsTurn2 = (await session.text()).includes("PAPAYA2");
		report.turns.push(
			await turn(
				"What was the first secret word I asked you to remember? Reply with it in uppercase, immediately followed by the digit 4, and nothing else.",
				"PAPAYA4",
			),
		);
		for (const item of switches) {
			const available = await selectModel(item.name);
			if (!available) {
				report.switches.push({ ...item, outcome: "unavailable" });
				continue;
			}
			const saved = savedModel();
			const result = await turn(
				`Reply with the word kiwi in uppercase, immediately followed by the digit ${item.digit}, and nothing else.`,
				`KIWI${item.digit}`,
			);
			report.switches.push({ ...item, saved, ...result });
		}
		stage = "quit after resume";
		report.secondExited = await quit();
	}

	const screenErrors = report.turns
		.concat(report.switches)
		.filter((item) => item.outcome === "error");
	report.reasoningContentRejected = screenErrors.some((item) =>
		String(item.error).includes("reasoning_content"),
	);
	report.passed =
		report.turns.length === 4 &&
		report.turns.every((item) => item.outcome === "ok") &&
		report.resumeFound &&
		report.firstExited === true &&
		report.secondExited === true &&
		!report.reasoningContentRejected &&
		report.switches.every(
			(item) =>
				item.outcome === "unavailable" ||
				(["ok", "account-limit"].includes(item.outcome) &&
					item.saved === item.id),
		);
	console.log(JSON.stringify(report));
	if (!report.passed) process.exitCode = 1;
} catch (error) {
	let screen = "";
	try {
		screen = (await session?.text()) ?? "";
	} catch {
		// The terminal may already have exited.
	}
	console.error(
		redact(
			`Live PTY failed at ${stage}: report=${JSON.stringify(report)} ${String(error?.message ?? "unknown").split("Current terminal content")[0]} terminal=${screen}`,
		).slice(0, 1_800),
	);
	process.exitCode = 1;
} finally {
	if (session) {
		try {
			await session.press(["ctrl", "c"]);
			await session.press(["ctrl", "c"]);
			await session.waitForExit(3_000);
		} catch {
			// The terminal may already have exited.
		}
		session.close();
	}
}
