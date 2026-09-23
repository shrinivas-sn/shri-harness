import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { launchTerminal } from "tuistory";

const [binaryPath, workingDirectory, settingsPath] = process.argv.slice(2);
if (!binaryPath || !workingDirectory || !settingsPath) {
	console.error("Installed model PTY input missing");
	process.exit(2);
}

async function openModelPicker(session) {
	stage = "slash suggestion";
	await session.type("/model");
	await session.waitForText("Switch model or provider", { timeout: 10_000 });
	stage = "model dialog";
	await session.press("enter");
	lastFrame = await session.text();
	await session.waitForText("Select Model", { timeout: 20_000 });
}

let session;
let catalogServer;
let catalogRequests = 0;
let stage = "launch";
let lastFrame = "";
try {
	catalogServer = createServer((_request, response) => {
		catalogRequests += 1;
		response.writeHead(200, { "content-type": "application/json" });
		response.end(
			JSON.stringify({
				groq: {
					id: "groq",
					models: {
						"shri-fixture-chat-no-metadata": { tool_call: true },
						"shri-fixture-transcription": {
							tool_call: true,
							modalities: { input: ["audio"], output: ["text"] },
						},
					},
				},
			}),
		);
	});
	await new Promise((resolve) => catalogServer.listen(0, "127.0.0.1", resolve));
	const catalogAddress = catalogServer.address();
	if (!catalogAddress || typeof catalogAddress === "string")
		throw new Error("Catalog fixture address missing");
	const saved = JSON.parse(readFileSync(settingsPath, "utf8"));
	saved.providers.groq.settings.modelCatalog = {
		url: `http://127.0.0.1:${catalogAddress.port}/catalog.json`,
		loadLatestOnInit: true,
	};
	writeFileSync(settingsPath, JSON.stringify(saved));
	session = await launchTerminal({
		command: binaryPath,
		args: ["--provider", "groq", "-m", "openai/gpt-oss-120b"],
		cwd: workingDirectory,
		env: { ...process.env, CI: undefined, VITEST: undefined },
		cols: 120,
		rows: 36,
		waitForDataTimeout: 20_000,
	});
	await session.waitForText("What can I do for you?", { timeout: 20_000 });
	stage = "open";
	await openModelPicker(session);
	const modelOpen = (await session.text()).includes("Select Model");
	stage = "transcription search";
	await session.type("whisper");
	await session.waitForText("Create custom model ID", { timeout: 10_000 });
	const filteredScreen = await session.text();
	const transcriptionFiltered =
		!filteredScreen.includes("Whisper Large") &&
		!filteredScreen.includes("whisper-large-v3");
	await session.press("escape");
	await session.waitForText("What can I do for you?", { timeout: 10_000 });
	stage = "missing metadata catalog search";
	await openModelPicker(session);
	await session.type("shri-fixture");
	await session.waitForText("Create custom model ID", { timeout: 10_000 });
	const fixtureScreen = await session.text();
	const missingMetadataRendered = fixtureScreen.includes(
		"shri-fixture-chat-no-metadata",
	);
	const localCatalogRequested = catalogRequests > 0;
	const fixtureTranscriptionFiltered = !fixtureScreen.includes(
		"shri-fixture-transcription",
	);
	await session.press("escape");
	await session.waitForText("What can I do for you?", { timeout: 10_000 });
	stage = "chat selection";
	await openModelPicker(session);
	await session.type("Llama 3.3 70B");
	await session.waitForText("Llama 3.3 70B", { timeout: 10_000 });
	await session.press("enter");
	await session.waitForText("What can I do for you?", { timeout: 10_000 });
	const selectedModel = JSON.parse(readFileSync(settingsPath, "utf8")).providers
		.groq.settings.model;
	const modelSelected = selectedModel === "llama-3.3-70b-versatile";
	stage = "reopen";
	await openModelPicker(session);
	await session.press("escape");
	await session.waitForText("What can I do for you?", { timeout: 10_000 });
	const modelReopened = (await session.text()).includes(
		"What can I do for you?",
	);
	await session.press(["ctrl", "c"]);
	await session.press(["ctrl", "c"]);
	const shutdown = await session.waitForExit(5_000);
	console.log(
		JSON.stringify({
			modelOpen,
			transcriptionFiltered,
			missingMetadataRendered,
			localCatalogRequested,
			fixtureTranscriptionFiltered,
			modelSelected,
			modelReopened: modelReopened && shutdown,
		}),
	);
	if (
		!modelOpen ||
		!transcriptionFiltered ||
		!missingMetadataRendered ||
		!localCatalogRequested ||
		!fixtureTranscriptionFiltered ||
		!modelSelected ||
		!modelReopened ||
		!shutdown
	)
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
	const detail =
		`${String(error?.message ?? "unknown")} frame=${lastFrame} terminal=${session?.read() ?? ""} logs=${recentLogs}`
			.replace(/gsk_[A-Za-z0-9_-]+|sk-[A-Za-z0-9_-]{12,}/g, "[REDACTED]")
			.replace(/\s+/g, " ")
			.slice(0, 1_600);
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
	if (catalogServer)
		await new Promise((resolve) => catalogServer.close(resolve));
}
