import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { launchTerminal } from "tuistory";

// Installed /model journey (matrix GR-05, GR-06, GR-10, GR-11, GR-13, GR-15,
// GR-16, GR-17, GR-19). One loopback fixture serves /models, chat and the
// catalog, so the picker never reaches a real Groq endpoint.

const [binaryPath, workingDirectory, settingsPath] = process.argv.slice(2);
if (!binaryPath || !workingDirectory || !settingsPath) {
	console.error("Installed model PTY input missing");
	process.exit(2);
}

const savedKey = "gsk_SHRI_INSTALLED_SAVED_TEST_ONLY";
const temporaryKey = "gsk_SHRI_INSTALLED_MODEL_TEMP_TEST_ONLY";
const READY = "What can I do for you?";
// Not listed by /models and not in the catalog: reachable only manually.
const MANUAL_MODEL = "shri-fixture-manual-entry";
const listedModels = [
	"openai/gpt-oss-120b",
	"openai/gpt-oss-20b",
	"llama-3.3-70b-versatile",
	"llama-3.1-8b-instant",
	"qwen/qwen3.8-27b",
	"whisper-large-v3",
	"shri-fixture-chat-no-metadata",
];
// Per Groq's reasoning docs (checked 07/10/2026); anything else is rejected.
const allowedOptions = {
	"openai/gpt-oss-120b": {
		efforts: ["low", "medium", "high"],
		visibility: true,
	},
	"openai/gpt-oss-20b": {
		efforts: ["low", "medium", "high"],
		visibility: true,
	},
	"qwen/qwen3.8-27b": { efforts: ["low", "medium", "high"], visibility: false },
};

let modelsMode = "list";
const modelsRequests = [];
const chat = [];
let catalogRequests = 0;
let unknownPaths = 0;

function optionViolation(body) {
	const allowed = allowedOptions[body?.model];
	if (body?.reasoning_format !== undefined) return "reasoning_format";
	if (
		body?.reasoning_effort !== undefined &&
		!allowed?.efforts.includes(body.reasoning_effort)
	)
		return "reasoning_effort";
	if (body?.include_reasoning !== undefined && !allowed?.visibility)
		return "include_reasoning";
	return undefined;
}

function textOf(content) {
	if (typeof content === "string") return content;
	if (Array.isArray(content))
		return content.map((part) => part?.text ?? "").join("");
	return "";
}

function chatReply(body, response) {
	const messages = Array.isArray(body?.messages) ? body.messages : [];
	const lastUser = [...messages].reverse().find((m) => m?.role === "user");
	const token = textOf(lastUser?.content).match(/SWITCH\d+/)?.[0] ?? "NONE";
	const chunk = (delta, finishReason = null) => ({
		id: "model-fixture",
		object: "chat.completion.chunk",
		created: 0,
		model: body?.model,
		choices: [{ index: 0, delta, finish_reason: finishReason }],
	});
	response.writeHead(200, { "content-type": "text/event-stream" });
	response.end(
		`${[
			chunk({ role: "assistant", content: `${token}-OK` }),
			{
				...chunk({}, "stop"),
				usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
			},
		]
			.map((item) => `data: ${JSON.stringify(item)}\n\n`)
			.join("")}data: [DONE]\n\n`,
	);
	return token;
}

const server = createServer((request, response) => {
	const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
	let raw = "";
	request.on("data", (part) => {
		raw = (raw + part.toString()).slice(-2_000_000);
	});
	request.on("end", () => {
		if (path === "/catalog.json") {
			catalogRequests += 1;
			response.writeHead(200, { "content-type": "application/json" });
			response.end(
				JSON.stringify({
					groq: {
						id: "groq",
						models: {
							"shri-fixture-chat-no-metadata": { tool_call: true },
							"shri-fixture-catalog-only": { tool_call: true },
							"shri-fixture-transcription": {
								tool_call: true,
								modalities: { input: ["audio"], output: ["text"] },
							},
						},
					},
				}),
			);
			return;
		}
		if (path === "/openai/v1/models") {
			modelsRequests.push(request.headers.authorization ?? "");
			if (modelsMode === "malformed") {
				response.writeHead(200, { "content-type": "application/json" });
				response.end("{not json");
				return;
			}
			// Never answers; the client's 5 s discovery deadline must fire.
			if (modelsMode === "stall") return;
			if (modelsMode === "auth") {
				response.writeHead(401, { "content-type": "application/json" });
				response.end(JSON.stringify({ error: { message: "fixture 401" } }));
				return;
			}
			response.writeHead(200, { "content-type": "application/json" });
			response.end(
				JSON.stringify({
					data: (modelsMode === "empty" ? [] : listedModels).map((id) => ({
						id,
						object: "model",
					})),
				}),
			);
			return;
		}
		if (path === "/openai/v1/chat/completions") {
			let body;
			try {
				body = JSON.parse(raw);
			} catch {
				response.writeHead(400).end();
				return;
			}
			const violation = optionViolation(body);
			const record = {
				model: body?.model,
				reasoning_effort: body?.reasoning_effort,
				include_reasoning: body?.include_reasoning,
				authorization: request.headers.authorization ?? "",
				violation,
			};
			chat.push(record);
			if (violation) {
				response.writeHead(400, { "content-type": "application/json" });
				response.end(JSON.stringify({ error: { message: violation } }));
				return;
			}
			record.token = chatReply(body, response);
			return;
		}
		unknownPaths += 1;
		response.writeHead(404).end();
	});
});

let session;
let stage = "launch";
let lastFrame = "";
/**
 * Types into the prompt and waits for it to show. A prompt that ignores keys
 * after a dialog closed lost focus (Plan issue 7), so fail instead of retyping.
 */
async function typeEchoed(text, echo = text) {
	await session.type(text);
	try {
		await session.waitForText(echo, { timeout: 5_000 });
		return;
	} catch {
		// Tab toggles Plan/Act through the root key handler, so a changed status
		// line means keys arrive but the prompt lacks focus.
		const before = await session.text();
		await session.press("tab");
		await new Promise((resolve) => setTimeout(resolve, 800));
		const after = await session.text();
		const mode = (screen) =>
			screen.includes("● Plan")
				? "plan"
				: screen.includes("● Act")
					? "act"
					: "?";
		throw new Error(
			`prompt ignored input ${echo} (tab ${mode(before)}->${mode(after)})`,
		);
	}
}

function savedGroq() {
	return JSON.parse(readFileSync(settingsPath, "utf8")).providers.groq.settings;
}

async function openModelPicker() {
	const caller = stage.split(" > ")[0];
	stage = `${caller} > slash suggestion`;
	await typeEchoed("/model", "Switch model or provider");
	stage = `${caller} > model dialog`;
	await session.press("enter");
	lastFrame = await session.text();
	await session.waitForText("Select Model", { timeout: 20_000 });
	// Typing while the loading overlay is still closing loses keystrokes.
	const deadline = Date.now() + 20_000;
	while ((await session.text()).includes("Loading")) {
		if (Date.now() > deadline) throw new Error("loading overlay stayed open");
		await new Promise((resolve) => setTimeout(resolve, 150));
	}
}

const DIALOG_TEXT = [
	"Select Model",
	"Thinking Level for",
	"Applying model",
	"Loading models",
];

/** The welcome text only shows on an empty session, so wait for dialogs to close. */
async function waitForPrompt(timeout = 20_000) {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		const screen = await session.text();
		if (
			(screen.includes("Ask anything") || screen.includes(READY)) &&
			!DIALOG_TEXT.some((text) => screen.includes(text))
		)
			return await waitForStableScreen(deadline);
		await new Promise((resolve) => setTimeout(resolve, 150));
	}
	throw new Error("prompt did not return");
}

/** Applying a model restarts the session runtime; wait until the UI settles. */
async function waitForStableScreen(deadline) {
	let previous = await session.text();
	let stableSince = Date.now();
	while (Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 150));
		const current = await session.text();
		if (current !== previous) {
			previous = current;
			stableSince = Date.now();
		} else if (Date.now() - stableSince >= 600) {
			return current;
		}
	}
	throw new Error("screen did not settle");
}

async function backToPrompt() {
	await session.press("escape");
	await waitForPrompt(10_000);
}

/** Selects a model by its display name; `moves` drives the thinking dialog. */
async function selectModel(name, moves) {
	await openModelPicker();
	stage = `select ${name}`;
	await session.type(name);
	await session.waitForText(name, { timeout: 10_000 });
	await session.press("enter");
	if (moves) {
		await session.waitForText("Thinking Level for", { timeout: 10_000 });
		for (const key of moves) await session.press(key);
		await session.press("enter");
	}
	await waitForPrompt();
}

async function send(token) {
	stage = `send ${token}`;
	const before = chat.length;
	await typeEchoed(`Reply with ${token}`);
	await session.press("enter");
	await session.waitForText(`${token}-OK`, { timeout: 30_000 });
	return chat.slice(before).find((item) => item.token === token);
}

try {
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	if (!address || typeof address === "string")
		throw new Error("Model fixture address missing");
	const saved = JSON.parse(readFileSync(settingsPath, "utf8"));
	saved.providers.groq.settings.baseUrl = `http://127.0.0.1:${address.port}/openai/v1`;
	saved.providers.groq.settings.model = "openai/gpt-oss-120b";
	delete saved.providers.groq.settings.reasoning;
	saved.providers.groq.settings.modelCatalog = {
		url: `http://127.0.0.1:${address.port}/catalog.json`,
		loadLatestOnInit: true,
	};
	writeFileSync(settingsPath, JSON.stringify(saved));
	const savedKeyBefore = savedGroq().apiKey;

	session = await launchTerminal({
		command: binaryPath,
		args: [
			"--provider",
			"groq",
			"-m",
			"openai/gpt-oss-120b",
			"--key",
			temporaryKey,
		],
		cwd: workingDirectory,
		env: { ...process.env, CI: undefined, VITEST: undefined },
		cols: 120,
		rows: 36,
		waitForDataTimeout: 20_000,
	});
	await session.waitForText(READY, { timeout: 20_000 });

	stage = "open";
	await openModelPicker();
	const modelOpen = (await session.text()).includes("Select Model");
	stage = "transcription search";
	await session.type("whisper");
	await session.waitForText("Create custom model ID", { timeout: 10_000 });
	const filteredScreen = await session.text();
	const transcriptionFiltered =
		!filteredScreen.includes("Whisper") &&
		!filteredScreen.includes("whisper-large-v3");
	await backToPrompt();

	stage = "fixture listing";
	await openModelPicker();
	await session.type("shri-fixture");
	await session.waitForText("Create custom model ID", { timeout: 10_000 });
	const fixtureScreen = await session.text();
	const missingMetadataRendered = fixtureScreen.includes(
		"shri-fixture-chat-no-metadata",
	);
	const catalogOnlyExcluded = !fixtureScreen.includes(
		"shri-fixture-catalog-only",
	);
	const fixtureTranscriptionFiltered = !fixtureScreen.includes(
		"shri-fixture-transcription",
	);
	const localCatalogRequested = catalogRequests > 0;
	await backToPrompt();

	stage = "cancel in thinking dialog";
	await openModelPicker();
	await session.type("GPT OSS 20B");
	await session.waitForText("GPT OSS 20B", { timeout: 10_000 });
	await session.press("enter");
	await session.waitForText("Thinking Level for", { timeout: 10_000 });
	await session.press("escape");
	await session.waitForText("Select Model", { timeout: 10_000 });
	await backToPrompt();
	const cancelProbe = await send("SWITCH0");
	const selectionCancelKeepsModel =
		savedGroq().model === "openai/gpt-oss-120b" &&
		cancelProbe?.model === "openai/gpt-oss-120b";

	stage = "switches";
	await selectModel("GPT OSS 120B", ["down"]); // Medium → High
	const high = await send("SWITCH1");
	await selectModel("Llama 3.1 8B");
	const plain = await send("SWITCH2");
	await selectModel("GPT OSS 20B", ["up", "up"]); // Medium → Off
	const off = await send("SWITCH3");
	await selectModel("Qwen3.8 27B", ["up"]); // Medium → Low
	const low = await send("SWITCH4");
	const switchOptions =
		high?.model === "openai/gpt-oss-120b" &&
		high.reasoning_effort === "high" &&
		high.include_reasoning === undefined &&
		plain?.model === "llama-3.1-8b-instant" &&
		plain.reasoning_effort === undefined &&
		plain.include_reasoning === undefined &&
		off?.model === "openai/gpt-oss-20b" &&
		off.reasoning_effort === undefined &&
		off.include_reasoning === false &&
		low?.model === "qwen/qwen3.8-27b" &&
		low.reasoning_effort === "low" &&
		low.include_reasoning === undefined;
	const modelSelected = savedGroq().model === "qwen/qwen3.8-27b";

	stage = "discovery failure";
	modelsMode = "auth";
	await openModelPicker();
	await session.waitForText("Availability not verified", { timeout: 10_000 });
	await backToPrompt();
	const discoveryFailureNotice = savedGroq().model === "qwen/qwen3.8-27b";
	const afterFailure = await send("SWITCH5");
	const turnAfterFailure =
		afterFailure?.model === "qwen/qwen3.8-27b" &&
		afterFailure.reasoning_effort === "low";

	stage = "malformed listing";
	modelsMode = "malformed";
	await openModelPicker();
	await session.waitForText("returned an unusable", {
		timeout: 10_000,
	});
	await backToPrompt();
	const discoveryMalformedNotice = savedGroq().model === "qwen/qwen3.8-27b";

	stage = "stalled listing";
	modelsMode = "stall";
	const stallStarted = Date.now();
	await openModelPicker();
	await session.waitForText("did not return its", {
		timeout: 10_000,
	});
	const discoveryStallBounded = Date.now() - stallStarted <= 12_000;
	await backToPrompt();

	stage = "empty listing";
	modelsMode = "empty";
	await openModelPicker();
	await session.waitForText("Groq listed no models", { timeout: 10_000 });
	const emptyScreen = await session.text();
	const discoveryEmptyManual =
		emptyScreen.includes("Create custom model ID") &&
		!emptyScreen.includes("GPT OSS 120B");

	stage = "manual entry";
	await session.press("enter");
	await session.waitForText("Model ID", { timeout: 10_000 });
	// The warning wraps in the dialog, so match its first words only.
	const manualWarningShown = await session
		.waitForText("Tool and reasoning support", { timeout: 5_000 })
		.then(() => true)
		.catch(() => false);
	await session.type(MANUAL_MODEL);
	await session.waitForText(MANUAL_MODEL, { timeout: 5_000 });
	await session.press("enter");
	await waitForPrompt();
	modelsMode = "list";
	const manual = await send("SWITCH6");
	const manualEntryTurn =
		manualWarningShown &&
		savedGroq().model === MANUAL_MODEL &&
		manual?.model === MANUAL_MODEL &&
		manual.reasoning_effort === undefined &&
		manual.include_reasoning === undefined;
	if (!manualEntryTurn) {
		const { authorization, ...body } = manual ?? {};
		console.error(
			`manual entry: warning=${manualWarningShown} saved=${savedGroq().model} request=${JSON.stringify(body)}`,
		);
	}

	stage = "reopen";
	await openModelPicker();
	await backToPrompt();
	const modelReopened = Boolean(await waitForPrompt(5_000));

	// Raw screen, before any redaction: neither key may ever be rendered.
	const finalScreen = await session.text();
	const keyAbsentFromTerminal = [finalScreen, lastFrame].every(
		(screen) => !screen.includes(temporaryKey) && !screen.includes(savedKey),
	);
	await session.press(["ctrl", "c"]);
	await session.press(["ctrl", "c"]);
	const shutdown = await session.waitForExit(5_000);
	const report = {
		modelOpen,
		transcriptionFiltered,
		missingMetadataRendered,
		localCatalogRequested,
		fixtureTranscriptionFiltered,
		catalogOnlyExcluded,
		discoveryRequested: modelsRequests.length > 0,
		temporaryKeyDiscovery:
			modelsRequests.length > 0 &&
			modelsRequests.every((value) => value === `Bearer ${temporaryKey}`) &&
			chat.every((item) => item.authorization === `Bearer ${temporaryKey}`),
		savedKeyUnchanged:
			savedKeyBefore === savedKey && savedGroq().apiKey === savedKey,
		selectionCancelKeepsModel,
		switchOptions,
		noOptionRejected: chat.length > 0 && chat.every((item) => !item.violation),
		modelSelected,
		discoveryFailureNotice,
		discoveryEmptyManual,
		turnAfterFailure,
		discoveryMalformedNotice,
		discoveryStallBounded,
		manualEntryTurn,
		noUnknownRequests: unknownPaths === 0,
		keyAbsentFromTerminal,
		modelReopened: modelReopened && shutdown,
	};
	console.log(JSON.stringify(report));
	if (Object.values(report).some((value) => value !== true))
		process.exitCode = 1;
} catch (error) {
	const logPath = join(process.env.SHRI_DIR ?? "", "data", "logs", "shri.log");
	const recentLogs = existsSync(logPath)
		? readFileSync(logPath, "utf8")
				.trim()
				.split(/\r?\n/)
				.map((line) => {
					try {
						const entry = JSON.parse(line);
						if (entry.level < 40 && !String(entry.msg).includes("startup"))
							return "";
						return `${entry.msg ?? ""} kind=${entry.kind ?? ""} ${String(
							entry.err?.stack ?? entry.err?.message ?? "",
						)
							.split(/\r?\n/)
							.slice(0, 8)
							.join(" ")}`;
					} catch {
						return "";
					}
				})
				.filter(Boolean)
				.slice(-8)
				.join(" | ")
		: "no log";
	let screen = "";
	try {
		screen = (await session?.text()) ?? "";
	} catch {
		// The terminal may already have exited.
	}
	const detail =
		`terminal=${screen} chat=${JSON.stringify(chat.map(({ authorization, ...rest }) => rest))} models=${modelsRequests.length} ${String(error?.message ?? "unknown").split("Current terminal content")[0]} logs=${recentLogs} frame=${lastFrame.slice(0, 300)}`
			.replace(/gsk_[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]{12,}/g, "[REDACTED]")
			.replace(/\s+/g, " ")
			.slice(0, 2_000);
	console.error(`Installed model PTY failed at ${stage}: ${detail}`);
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
	}
	session?.close();
	server.closeAllConnections();
	await new Promise((resolve) => server.close(resolve));
}
