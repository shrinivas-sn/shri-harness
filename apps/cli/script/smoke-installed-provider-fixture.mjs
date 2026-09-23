import { spawn, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";

const [binaryPath, workingDirectory, settingsPath] = process.argv.slice(2);
if (!binaryPath || !workingDirectory || !settingsPath) {
	console.error("Installed provider fixture input missing");
	process.exit(2);
}

const savedKey = "gsk_SHRI_INSTALLED_SAVED_TEST_ONLY";
const environmentKey = "gsk_SHRI_INSTALLED_ENV_TEST_ONLY";
const commandLineKey = "gsk_SHRI_INSTALLED_CLI_TEST_ONLY";
const modelId = "llama-3.3-70b-versatile";
const fileMarker = "SHRI_INSTALLED_LOCAL_FILE_READ_MARKER";
const commandMarker = "SHRI_INSTALLED_LOCAL_COMMAND_MARKER";
const harmlessCommand = `node -e "console.log('${commandMarker}')"`;
const filePath = join(workingDirectory, "fixture-read.txt");
const requests = [];
let toolMode = "none";
let toolStep = 0;
let toolResultSeen = false;
let transientFailures = 0;
let interruptedClosed = false;
function sendStream(response, chunks) {
	response.writeHead(200, {
		"content-type": "text/event-stream",
		"cache-control": "no-cache",
	});
	response.end(
		`${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`,
	);
}
const server = createServer((request, response) => {
	const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
	let body = "";
	request.on("data", (chunk) => {
		body = (body + chunk.toString()).slice(-1_000_000);
	});
	request.on("end", () => {
		requests.push({ path, authorization: request.headers.authorization ?? "" });
		if (!path.endsWith("/chat/completions")) {
			response.writeHead(404).end();
			return;
		}
		if (toolMode === "invalid-auth") {
			response.writeHead(401, { "content-type": "application/json" });
			response.end(
				JSON.stringify({
					error: { message: "Invalid API Key", type: "invalid_api_key" },
				}),
			);
			return;
		}
		if (toolMode === "transient" && transientFailures === 0) {
			transientFailures += 1;
			response.writeHead(503, { "content-type": "application/json" });
			response.end(
				JSON.stringify({ error: { message: "Temporary fixture outage" } }),
			);
			return;
		}
		if (toolMode === "interrupted") {
			response.on("close", () => {
				interruptedClosed = true;
			});
			response.writeHead(200, { "content-type": "text/event-stream" });
			response.write(
				`data: ${JSON.stringify({ id: "fixture-interrupted", object: "chat.completion.chunk", created: 0, model: modelId, choices: [{ index: 0, delta: { role: "assistant", content: "partial" }, finish_reason: null }] })}\n\n`,
			);
			return;
		}
		if (toolMode === "file" || toolMode === "command") {
			toolStep += 1;
			if (toolStep === 1) {
				const call =
					toolMode === "file"
						? {
								name: "read_files",
								arguments: JSON.stringify({ files: [{ path: filePath }] }),
							}
						: {
								name: "run_commands",
								arguments: JSON.stringify({ commands: [harmlessCommand] }),
							};
				sendStream(response, [
					{
						id: "fixture-tool",
						object: "chat.completion.chunk",
						created: 0,
						model: modelId,
						choices: [
							{
								index: 0,
								delta: {
									role: "assistant",
									tool_calls: [
										{
											index: 0,
											id: "fixture_tool",
											type: "function",
											function: call,
										},
									],
								},
								finish_reason: null,
							},
						],
					},
					{
						id: "fixture-tool",
						object: "chat.completion.chunk",
						created: 0,
						model: modelId,
						choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
					},
				]);
				return;
			}
			toolResultSeen = body.includes(
				toolMode === "file" ? fileMarker : commandMarker,
			);
		}
		sendStream(response, [
			{
				id: "fixture",
				object: "chat.completion.chunk",
				created: 0,
				model: modelId,
				choices: [
					{
						index: 0,
						delta: { role: "assistant", content: "OK" },
						finish_reason: null,
					},
				],
			},
			{
				id: "fixture",
				object: "chat.completion.chunk",
				created: 0,
				model: modelId,
				choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
				usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
			},
		]);
	});
});

function readSettings() {
	return JSON.parse(readFileSync(settingsPath, "utf8"));
}

function historySessionIds() {
	const outcome = spawnSync(binaryPath, ["history", "--json"], {
		cwd: workingDirectory,
		env: process.env,
		encoding: "utf8",
		maxBuffer: 1024 * 1024,
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

async function runCase(input, expectedKey) {
	const before = requests.length;
	const args = [
		"--provider",
		"groq",
		"--model",
		modelId,
		"--json",
		"--timeout",
		input.timeout ?? "12",
		...(input.cliKey ? ["--key", input.cliKey] : []),
		input.prompt ?? "Reply OK only",
	];
	const env = { ...process.env };
	if (input.envKey) env.GROQ_API_KEY = input.envKey;
	else delete env.GROQ_API_KEY;
	const outcome = await new Promise((resolve) => {
		const child = spawn(binaryPath, args, {
			cwd: workingDirectory,
			env,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		const timer = setTimeout(() => child.kill(), 25_000);
		child.stdout.on("data", (chunk) => {
			stdout = (stdout + chunk.toString()).slice(-1_000_000);
		});
		child.stderr.on("data", (chunk) => {
			stderr = (stderr + chunk.toString()).slice(-1_000_000);
		});
		child.on("error", () => {
			clearTimeout(timer);
			resolve({ code: -1, stdout, stderr });
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			resolve({ code, stdout, stderr });
		});
	});
	const currentRequests = requests
		.slice(before)
		.filter((item) => item.path.endsWith("/chat/completions"));
	return {
		requestCount: currentRequests.length,
		streamed:
			outcome.code === 0 && outcome.stdout.includes('"type":"run_result"'),
		failed: outcome.code !== 0,
		abortReported: /run_aborted|timed out|abort requested/i.test(
			outcome.stdout + outcome.stderr,
		),
		authRejected: /401|invalid api key|unauthorized/i.test(
			outcome.stdout + outcome.stderr,
		),
		keyMatches:
			currentRequests.length > 0 &&
			currentRequests.every(
				(item) => item.authorization === `Bearer ${expectedKey}`,
			),
		keyAbsentFromOutput:
			!outcome.stdout.includes(expectedKey) &&
			!outcome.stderr.includes(expectedKey),
		savedKeyUnchanged:
			readSettings().providers.groq.settings.apiKey === savedKey,
	};
}

try {
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address();
	if (!address || typeof address === "string")
		throw new Error("no-fixture-port");
	const settings = readSettings();
	if (settings.providers?.groq?.settings?.apiKey !== savedKey)
		throw new Error("unexpected-saved-key");
	settings.providers.groq.settings.baseUrl = `http://127.0.0.1:${address.port}/openai/v1`;
	writeFileSync(settingsPath, `${JSON.stringify(settings)}\n`);
	const saved = await runCase({}, savedKey);
	const historyBeforeRestart = historySessionIds();
	const environment = await runCase({ envKey: environmentKey }, environmentKey);
	const commandLine = await runCase(
		{ envKey: environmentKey, cliKey: commandLineKey },
		commandLineKey,
	);
	const historyAfterRestart = historySessionIds();
	const historyRestart =
		saved.streamed &&
		historyBeforeRestart.length > 0 &&
		historyAfterRestart.length > historyBeforeRestart.length &&
		historyBeforeRestart.every((id) => historyAfterRestart.includes(id));
	const keyPrecedence = [saved, environment, commandLine].every(
		(result) =>
			result.streamed && result.keyMatches && result.keyAbsentFromOutput,
	);
	const temporaryKeysNotPersisted = [saved, environment, commandLine].every(
		(result) => result.savedKeyUnchanged,
	);
	writeFileSync(filePath, `${fileMarker}\n`);
	toolMode = "file";
	const fileRead = await runCase(
		{ prompt: "Read fixture-read.txt, then reply OK" },
		savedKey,
	);
	const readFileTool =
		fileRead.streamed && fileRead.keyMatches && toolStep >= 2 && toolResultSeen;
	toolMode = "command";
	toolStep = 0;
	toolResultSeen = false;
	const commandRun = await runCase(
		{ prompt: "Run the harmless local command, then reply OK" },
		savedKey,
	);
	const commandTool =
		commandRun.streamed &&
		commandRun.keyMatches &&
		toolStep >= 2 &&
		toolResultSeen;
	toolMode = "invalid-auth";
	const rejected = await runCase({ prompt: "Reply OK only" }, savedKey);
	const invalidAuth =
		rejected.failed &&
		rejected.authRejected &&
		rejected.keyMatches &&
		rejected.keyAbsentFromOutput &&
		rejected.savedKeyUnchanged;
	toolMode = "transient";
	const recovered = await runCase({ prompt: "Reply OK only" }, savedKey);
	const transientRecovery =
		recovered.streamed &&
		recovered.keyMatches &&
		recovered.keyAbsentFromOutput &&
		recovered.savedKeyUnchanged &&
		transientFailures === 1 &&
		recovered.requestCount >= 2;
	toolMode = "interrupted";
	const interrupted = await runCase({ timeout: "2" }, savedKey);
	const interruptedStream =
		interrupted.failed &&
		interrupted.abortReported &&
		interrupted.keyMatches &&
		interrupted.keyAbsentFromOutput &&
		interrupted.savedKeyUnchanged &&
		interruptedClosed;
	console.log(
		JSON.stringify({
			keyPrecedence,
			temporaryKeysNotPersisted,
			readFileTool,
			commandTool,
			invalidAuth,
			transientRecovery,
			interruptedStream,
			historyRestart,
			historyCounts: [historyBeforeRestart.length, historyAfterRestart.length],
			cases: [
				saved,
				environment,
				commandLine,
				fileRead,
				commandRun,
				rejected,
				recovered,
				interrupted,
			],
			toolStep,
			toolResultSeen,
			transientFailures,
			interruptedClosed,
		}),
	);
	if (
		!keyPrecedence ||
		!temporaryKeysNotPersisted ||
		!readFileTool ||
		!commandTool ||
		!invalidAuth ||
		!transientRecovery ||
		!interruptedStream ||
		!historyRestart
	)
		process.exitCode = 1;
} catch (error) {
	console.error(
		`Installed provider fixture failed: ${error?.code ?? error?.message ?? "unknown"}`,
	);
	process.exitCode = 1;
} finally {
	server.closeAllConnections();
	server.close();
}
