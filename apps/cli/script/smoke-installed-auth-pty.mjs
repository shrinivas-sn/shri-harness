import { readFileSync } from "node:fs";
import { launchTerminal } from "tuistory";

const [wrapperPath, workingDirectory, settingsPath] = process.argv.slice(2);
if (!wrapperPath || !workingDirectory || !settingsPath) {
	console.error("Installed auth PTY input missing");
	process.exit(2);
}

const replacement = "gsk_SHRI_INSTALLED_REPLACEMENT_TEST_ONLY";
const readSavedKey = () =>
	JSON.parse(readFileSync(settingsPath, "utf8")).providers.groq.settings.apiKey;

async function startAuth() {
	return launchTerminal({
		command: process.execPath,
		args: [wrapperPath, "auth"],
		cwd: workingDirectory,
		env: process.env,
		cols: 120,
		rows: 30,
		waitForDataTimeout: 20_000,
	});
}

let session;
try {
	session = await startAuth();
	await session.waitForText("Replacing saved Groq API key", {
		timeout: 20_000,
	});
	await session.waitForText("Enter your Groq API key", { timeout: 20_000 });
	await session.type(replacement);
	await session.press("enter");
	await session.waitForText("saved successfully", { timeout: 10_000 });
	const replacementHidden = !(await session.text()).includes(replacement);
	const replaceExit = await session.waitForExit(5_000);
	session.close();
	session = undefined;
	const savedAfterReplace = readSavedKey();

	session = await startAuth();
	await session.waitForText("Enter your Groq API key", { timeout: 20_000 });
	await session.press(["ctrl", "c"]);
	await session.waitForText("Groq API key update cancelled", {
		timeout: 5_000,
	});
	const cancelExit = await session.waitForExit(5_000);
	const savedAfterCancel = readSavedKey();
	const authReplace =
		replacementHidden && replaceExit && savedAfterReplace === replacement;
	const authCancel = cancelExit && savedAfterCancel === savedAfterReplace;
	console.log(JSON.stringify({ authReplace, authCancel }));
	if (!authReplace || !authCancel) process.exitCode = 1;
} catch (error) {
	console.error(
		`Installed auth PTY failed: ${error?.code ?? error?.name ?? "unknown"}`,
	);
	process.exitCode = 1;
} finally {
	session?.close();
}
