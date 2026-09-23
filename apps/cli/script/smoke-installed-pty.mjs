import { launchTerminal } from "tuistory";

const [wrapperPath, workingDirectory] = process.argv.slice(2);
if (!wrapperPath || !workingDirectory) {
	console.error("Installed PTY input missing");
	process.exit(2);
}

let session;
let stage = "launch";
try {
	session = await launchTerminal({
		command: process.execPath,
		args: [wrapperPath, "--provider", "groq", "-m", "openai/gpt-oss-120b"],
		cwd: workingDirectory,
		env: process.env,
		cols: 120,
		rows: 36,
		waitForDataTimeout: 20_000,
	});
	stage = "prompt";
	await session.waitForText("What can I do for you?", { timeout: 20_000 });
	const startup = (await session.text()).includes("What can I do for you?");
	stage = "idle";
	const survivesIdle = !(await session.waitForExit(8_000));
	if (survivesIdle) {
		await session.press(["ctrl", "c"]);
		await session.press(["ctrl", "c"]);
	}
	stage = "shutdown";
	const shutdown = await session.waitForExit(5_000);
	console.log(
		JSON.stringify({
			startup,
			survivesIdle,
			shutdown,
			ptyPid: session.pty.pid,
			exitedAt: new Date().toISOString(),
		}),
	);
	if (!startup || !survivesIdle || !shutdown) process.exitCode = 1;
} catch (error) {
	console.error(
		`Installed PTY failed during ${stage}: ${error?.code ?? error?.name ?? "unknown"}`,
	);
	process.exitCode = 1;
} finally {
	session?.close();
}
