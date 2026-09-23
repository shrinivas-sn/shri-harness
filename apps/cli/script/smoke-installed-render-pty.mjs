import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { launchTerminal } from "tuistory";

const [binaryPath, workingDirectory, settingsPath] = process.argv.slice(2);
if (!binaryPath || !workingDirectory || !settingsPath) {
	console.error("Installed render PTY input missing");
	process.exit(2);
}

const modelId = "openai/gpt-oss-120b";
const markdown = "Here is code:\n\n```typescript\nconst answer = 42;\n```";
let requests = 0;
const server = createServer((request, response) => {
	if (!request.url?.endsWith("/chat/completions")) {
		response.writeHead(404).end();
		return;
	}
	requests += 1;
	response.writeHead(200, { "content-type": "text/event-stream" });
	response.end(
		`data: ${JSON.stringify({ id: "render-fixture", object: "chat.completion.chunk", created: 0, model: modelId, choices: [{ index: 0, delta: { role: "assistant", content: markdown }, finish_reason: null }] })}\n\ndata: ${JSON.stringify({ id: "render-fixture", object: "chat.completion.chunk", created: 0, model: modelId, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })}\n\ndata: [DONE]\n\n`,
	);
});

function codeColors(data) {
	for (const line of data.lines) {
		const visible = line.spans.map((span) => span.text).join("");
		const codeAt = visible.indexOf("const answer = 42;");
		if (codeAt < 0) continue;
		const foregrounds = line.spans.flatMap((span) =>
			Array.from(span.text, () => span.fg),
		);
		return {
			rendered: true,
			keyword: foregrounds[codeAt],
			identifier: foregrounds[codeAt + "const ".length],
			number: foregrounds[codeAt + "const answer = ".length],
		};
	}
	return { rendered: false };
}

let session;
let stage = "fixture setup";
try {
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	if (!address || typeof address === "string")
		throw new Error("Render fixture address missing");
	const saved = JSON.parse(readFileSync(settingsPath, "utf8"));
	saved.providers.groq.settings.baseUrl = `http://127.0.0.1:${address.port}/openai/v1`;
	writeFileSync(settingsPath, JSON.stringify(saved));
	stage = "launch";
	session = await launchTerminal({
		command: binaryPath,
		args: ["--provider", "groq", "-m", modelId],
		cwd: workingDirectory,
		env: { ...process.env, CI: undefined, VITEST: undefined },
		cols: 120,
		rows: 36,
		waitForDataTimeout: 20_000,
	});
	await session.waitForText("What can I do for you?", { timeout: 20_000 });
	stage = "prompt";
	await session.type("Show one TypeScript constant");
	await session.press("enter");
	await session.waitForText("const answer = 42;", { timeout: 20_000 });
	stage = "highlight";
	let colors = { rendered: false };
	for (let attempt = 0; attempt < 12; attempt += 1) {
		colors = codeColors(session.getTerminalData());
		if (
			colors.rendered &&
			colors.keyword &&
			colors.number &&
			colors.keyword !== colors.number
		)
			break;
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	const markdownCodeRendered = requests > 0 && colors.rendered;
	const syntaxHighlighted =
		markdownCodeRendered &&
		Boolean(colors.keyword && colors.number) &&
		colors.keyword !== colors.number;
	await session.press(["ctrl", "c"]);
	await session.press(["ctrl", "c"]);
	const shutdown = await session.waitForExit(5_000);
	console.log(
		JSON.stringify({
			markdownCodeRendered,
			syntaxHighlighted,
			shutdown,
			ptyPid: session.pty.pid,
			exitedAt: new Date().toISOString(),
		}),
	);
	if (!markdownCodeRendered || !syntaxHighlighted || !shutdown)
		process.exitCode = 1;
} catch (error) {
	console.error(
		`Installed render PTY failed at ${stage}: ${error?.code ?? error?.name ?? "unknown"}`,
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
	}
	session?.close();
	server.closeAllConnections();
	await new Promise((resolve) => server.close(resolve));
}
