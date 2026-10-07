import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { launchTerminal } from "tuistory";

// Installed multi-turn Groq journey (matrix GR-01, GR-02, GR-04, GR-08,
// GR-18, GR-20, GR-24). A strict loopback fixture streams reasoning on every
// reply and rejects any request that replays assistant reasoning_content.

const [binaryPath, workingDirectory, settingsPath] = process.argv.slice(2);
if (!binaryPath || !workingDirectory || !settingsPath) {
	console.error("Installed conversation PTY input missing");
	process.exit(2);
}

const savedKey = "gsk_SHRI_INSTALLED_SAVED_TEST_ONLY";
const modelId = "openai/gpt-oss-120b";
const fileMarker = "SHRI_CONVERSATION_FILE_MARKER";
const filePath = join(workingDirectory, "conversation-read.txt");
const READY = "What can I do for you?";
const chat = [];
let unknownPaths = 0;

function chunk(delta, finishReason = null) {
	return {
		id: "conversation-fixture",
		object: "chat.completion.chunk",
		created: 0,
		model: modelId,
		choices: [{ index: 0, delta, finish_reason: finishReason }],
	};
}

function sendStream(response, chunks) {
	response.writeHead(200, { "content-type": "text/event-stream" });
	response.end(
		`${chunks.map((item) => `data: ${JSON.stringify(item)}\n\n`).join("")}data: [DONE]\n\n`,
	);
}

function textOf(content) {
	if (typeof content === "string") return content;
	if (Array.isArray(content))
		return content.map((part) => part?.text ?? "").join("");
	return "";
}

/** Returns a rejection reason for anything Groq documents as unsupported. */
function strictViolation(body) {
	const messages = Array.isArray(body?.messages) ? body.messages : [];
	if (
		messages.some(
			(message) =>
				message?.role === "assistant" && "reasoning_content" in message,
		)
	)
		return "property 'reasoning_content' is unsupported";
	if (
		body?.reasoning_effort !== undefined &&
		!["low", "medium", "high"].includes(body.reasoning_effort)
	)
		return "unsupported reasoning_effort";
	return undefined;
}

function lastUserToken(messages) {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		if (messages[index]?.role !== "user") continue;
		const match = textOf(messages[index].content).match(/MARK\d+/);
		if (match) return match[0];
	}
	return undefined;
}

function handleChat(body, authorization, response) {
	const violation = strictViolation(body);
	const messages = Array.isArray(body?.messages) ? body.messages : [];
	const token = lastUserToken(messages);
	chat.push({ body, authorization, rejected: Boolean(violation), token });
	if (violation) {
		response.writeHead(400, { "content-type": "application/json" });
		response.end(
			JSON.stringify({
				error: { message: violation, type: "invalid_request_error" },
			}),
		);
		return;
	}
	const last = messages.at(-1);
	const wantsTool =
		token === "MARK3" &&
		last?.role === "user" &&
		textOf(last.content).includes("READFILE");
	if (wantsTool) {
		sendStream(response, [
			chunk({ role: "assistant", reasoning: `fixture reasoning ${token}` }),
			chunk({
				tool_calls: [
					{
						index: 0,
						id: "conversation_tool",
						type: "function",
						function: {
							name: "read_files",
							arguments: JSON.stringify({ files: [{ path: filePath }] }),
						},
					},
				],
			}),
			chunk({}, "tool_calls"),
		]);
		return;
	}
	sendStream(response, [
		chunk({ role: "assistant", reasoning: `fixture reasoning ${token}` }),
		chunk({ content: `${token ?? "NO-TOKEN"}-OK` }),
		{
			...chunk({}, "stop"),
			usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
		},
	]);
}

const server = createServer((request, response) => {
	const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
	let raw = "";
	request.on("data", (part) => {
		raw = (raw + part.toString()).slice(-2_000_000);
	});
	request.on("end", () => {
		if (path === "/openai/v1/chat/completions") {
			let body;
			try {
				body = JSON.parse(raw);
			} catch {
				response.writeHead(400).end();
				return;
			}
			handleChat(body, request.headers.authorization ?? "", response);
			return;
		}
		if (path === "/openai/v1/models") {
			response.writeHead(200, { "content-type": "application/json" });
			response.end(JSON.stringify({ data: [{ id: modelId }] }));
			return;
		}
		unknownPaths += 1;
		response.writeHead(404).end();
	});
});

async function post(port, body) {
	const result = await fetch(
		`http://127.0.0.1:${port}/openai/v1/chat/completions`,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		},
	);
	await result.text();
	return result.status;
}

function historySessionIds() {
	const outcome = spawnSync(binaryPath, ["history", "--json"], {
		cwd: workingDirectory,
		env: process.env,
		encoding: "utf8",
		maxBuffer: 4 * 1024 * 1024,
		timeout: 20_000,
	});
	if (outcome.status !== 0) return [];
	try {
		const rows = JSON.parse(outcome.stdout);
		return Array.isArray(rows)
			? rows.map((row) => row.sessionId).filter((id) => typeof id === "string")
			: [];
	} catch {
		return [];
	}
}

function processAlive(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

async function launch(args) {
	const session = await launchTerminal({
		command: binaryPath,
		args,
		cwd: workingDirectory,
		env: { ...process.env, CI: undefined, VITEST: undefined },
		cols: 120,
		rows: 40,
		waitForDataTimeout: 20_000,
	});
	return session;
}

/** Types a prompt and fails if it never shows, instead of retyping (Plan issue 7). */
async function typeEchoed(session, text) {
	await session.type(text);
	await session.waitForText(text, { timeout: 5_000 });
}

/** Sends a prompt and waits for its own reply marker, never an earlier one. */
async function turn(session, prompt, token) {
	await typeEchoed(session, prompt);
	await session.press("enter");
	await session.waitForText(`${token}-OK`, { timeout: 30_000 });
	return (await session.text()).includes(`${token}-OK`);
}

async function quit(session) {
	await session.press(["ctrl", "c"]);
	await session.press(["ctrl", "c"]);
	return await session.waitForExit(5_000);
}

const frames = [];
const sessions = [];
let stage = "fixture setup";
try {
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	if (!address || typeof address === "string")
		throw new Error("Conversation fixture address missing");

	stage = "calibration";
	const rejectsReplay =
		(await post(address.port, {
			model: modelId,
			messages: [
				{ role: "user", content: "x" },
				{ role: "assistant", content: "y", reasoning_content: "z" },
			],
		})) === 400;
	const acceptsValid =
		(await post(address.port, {
			model: modelId,
			messages: [{ role: "user", content: "MARK0" }],
		})) === 200;
	const calibrated = rejectsReplay && acceptsValid;
	chat.length = 0;

	const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
	settings.providers.groq.settings.baseUrl = `http://127.0.0.1:${address.port}/openai/v1`;
	settings.providers.groq.settings.model = modelId;
	writeFileSync(settingsPath, JSON.stringify(settings));
	writeFileSync(filePath, `${fileMarker}\n`);
	const historyBefore = historySessionIds();

	stage = "launch";
	const first = await launch(["--provider", "groq", "-m", modelId]);
	sessions.push(first);
	await first.waitForText(READY, { timeout: 20_000 });

	stage = "turn 1";
	const turn1 = await turn(first, "Reply with MARK1", "MARK1");
	stage = "turn 2";
	const turn2 = await turn(first, "Reply with MARK2", "MARK2");
	stage = "turn 3 tool";
	const turn3 = await turn(first, "READFILE then reply with MARK3", "MARK3");
	frames.push(await first.text());
	const firstPid = first.pty.pid;
	stage = "quit";
	const firstExited = await quit(first);

	const accepted = chat.filter((item) => !item.rejected);
	const turn2Body = accepted.find((item) => item.token === "MARK2")?.body;
	const turn2History = JSON.stringify(turn2Body?.messages ?? []);
	const toolFollowUp = accepted.find(
		(item) =>
			item.token === "MARK3" &&
			item.body.messages.some((message) => message.role === "tool"),
	)?.body;
	const toolMessages = toolFollowUp?.messages ?? [];
	const toolPairing =
		toolMessages.some(
			(message) =>
				message.role === "assistant" &&
				message.tool_calls?.some((call) => call.id === "conversation_tool"),
		) &&
		toolMessages.some(
			(message) =>
				message.role === "tool" &&
				message.tool_call_id === "conversation_tool" &&
				textOf(message.content).includes(fileMarker),
		);

	stage = "history";
	const historyAfter = historySessionIds();
	const newSessionId = historyAfter.find((id) => !historyBefore.includes(id));

	stage = "resume";
	let resumeRestart = false;
	let resumeHistory = false;
	let secondExited = false;
	let secondPid;
	if (newSessionId) {
		const second = await launch(["--id", newSessionId]);
		sessions.push(second);
		secondPid = second.pty.pid;
		await second.waitForText("MARK2-OK", { timeout: 20_000 });
		stage = "turn 4 after resume";
		resumeRestart = await turn(second, "Reply with MARK4", "MARK4");
		frames.push(await second.text());
		const resumed = chat.find(
			(item) => item.token === "MARK4" && !item.rejected,
		)?.body;
		const resumedHistory = JSON.stringify(resumed?.messages ?? []);
		resumeHistory =
			["MARK1-OK", "MARK2-OK", "MARK3"].every((marker) =>
				resumedHistory.includes(marker),
			) && resumedHistory.includes("conversation_tool");
		stage = "quit after resume";
		secondExited = await quit(second);
	}

	const report = {
		calibrated,
		conversationThreeTurns:
			turn1 &&
			turn2 &&
			turn3 &&
			turn2History.includes("MARK1-OK") &&
			!chat.some((item) => item.rejected),
		toolPairing: turn3 && toolPairing,
		resumeRestart: resumeRestart && resumeHistory,
		noReplayRejected: chat.length > 0 && !chat.some((item) => item.rejected),
		savedKeyUsed:
			chat.length > 0 &&
			chat.every((item) => item.authorization === `Bearer ${savedKey}`),
		keyAbsentFromTerminal: frames.every((frame) => !frame.includes(savedKey)),
		noUnknownRequests: unknownPaths === 0,
		cleanupComplete:
			firstExited &&
			secondExited &&
			!processAlive(firstPid) &&
			(secondPid === undefined || !processAlive(secondPid)),
		requestCount: chat.length,
	};
	console.log(JSON.stringify(report));
	if (
		Object.entries(report).some(
			([key, value]) => key !== "requestCount" && value !== true,
		)
	)
		process.exitCode = 1;
} catch (error) {
	let terminal = "";
	try {
		terminal = (await sessions.at(-1)?.text()) ?? "";
	} catch {
		// The terminal may already have exited.
	}
	const detail = `${String(error?.message ?? "unknown")} terminal=${terminal}`
		.replace(/gsk_[A-Za-z0-9_-]+/g, "[REDACTED]")
		.replace(/\s+/g, " ")
		.slice(0, 1_200);
	console.error(
		`Installed conversation PTY failed at ${stage}: ${detail} requests=${chat.length} rejected=${chat.filter((item) => item.rejected).length}`,
	);
	process.exitCode = 1;
} finally {
	for (const session of sessions) {
		try {
			await session.press(["ctrl", "c"]);
			await session.press(["ctrl", "c"]);
			await session.waitForExit(3_000);
		} catch {
			// The terminal may already have exited.
		}
		session.close();
	}
	server.closeAllConnections();
	await new Promise((resolve) => server.close(resolve));
}
