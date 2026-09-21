import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import type { ProviderSettingsManager, ProviderSettings } from "@cline/core";

export interface KeyValidationResult {
	valid: boolean;
	warning?: string;
	error?: string;
}

export function validateGroqKeyFormat(key: string): KeyValidationResult {
	const trimmed = key.trim();
	if (!trimmed) {
		return {
			valid: false,
			error: "API key cannot be empty",
		};
	}
	if (!trimmed.startsWith("gsk_")) {
		return {
			valid: true,
			warning: "Groq API keys typically start with 'gsk_'. Please double-check if this is correct.",
		};
	}
	return { valid: true };
}

export function maskApiKey(key: string): string {
	const trimmed = key.trim();
	if (trimmed.length <= 8) {
		return "****";
	}
	const prefix = trimmed.slice(0, 4);
	const suffix = trimmed.slice(-4);
	return `${prefix}...${suffix}`;
}

export function resolveGroqApiKey(manager?: Pick<ProviderSettingsManager, "getProviderSettings">): string | undefined {
	const envKey = process.env.GROQ_API_KEY?.trim();
	if (envKey) {
		return envKey;
	}
	const savedSettings = manager?.getProviderSettings("groq");
	const savedKey = savedSettings?.apiKey?.trim();
	if (savedKey) {
		return savedKey;
	}
	return undefined;
}

export function saveGroqApiKey(
	key: string,
	manager: Pick<ProviderSettingsManager, "getProviderSettings" | "saveProviderSettings">,
	model = "openai/gpt-oss-120b",
): void {
	const existing = manager.getProviderSettings("groq") ?? { provider: "groq" as ProviderSettings["provider"] };
	manager.saveProviderSettings({
		...existing,
		provider: "groq" as ProviderSettings["provider"],
		apiKey: key.trim(),
		model,
	});
}

/**
 * Prompts the user for sensitive input in the terminal without echoing raw characters in plain text.
 */
export async function promptHiddenInputInTerminal(promptText: string): Promise<string> {
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		throw new Error("Interactive input requires a TTY terminal session");
	}

	return new Promise<string>((resolve) => {
		// Custom writable stream that masks input with asterisks
		let muted = false;
		const mutableStdout = new Writable({
			write(chunk, encoding, callback) {
				if (!muted) {
					process.stdout.write(chunk, encoding);
				} else {
					const str = chunk.toString();
					// Echo * for typing characters, preserve newlines
					if (str.includes("\n") || str.includes("\r")) {
						process.stdout.write("\n");
					} else {
						process.stdout.write("*".repeat(str.length));
					}
				}
				callback();
			},
		});

		const rl = createInterface({
			input: process.stdin,
			output: mutableStdout,
			terminal: true,
		});

		process.stdout.write(promptText);
		muted = true;

		rl.question("", (answer) => {
			muted = false;
			rl.close();
			resolve(answer.trim());
		});
	});
}

export interface EnsureGroqApiKeyOptions {
	manager: Pick<ProviderSettingsManager, "getProviderSettings" | "saveProviderSettings">;
	isTTY?: boolean;
	promptFn?: () => Promise<string>;
	io?: {
		writeln: (text: string) => void;
		writeErr: (text: string) => void;
	};
	model?: string;
}

export async function ensureGroqApiKey(options: EnsureGroqApiKeyOptions): Promise<string> {
	const existingKey = resolveGroqApiKey(options.manager);
	if (existingKey) {
		return existingKey;
	}

	const isTTY = options.isTTY ?? (Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY));
	if (!isTTY && !options.promptFn) {
		throw new Error(
			"No Groq API key found. In automated or non-interactive environments, set the GROQ_API_KEY environment variable.",
		);
	}

	const io = options.io ?? {
		writeln: (msg: string) => console.log(msg),
		writeErr: (msg: string) => console.error(msg),
	};

	io.writeln("\n⚡ Welcome to Shri!");
	io.writeln("Shri uses Groq Cloud for ultra-fast, free multi-agent inference.");
	io.writeln("Get your free API key at: https://console.groq.com/keys\n");
	io.writeln("🔒 Your key is saved locally in ~/.shri/data/settings/providers.json and never sent elsewhere.");

	let enteredKey = "";
	while (!enteredKey) {
		const prompt = "Enter your Groq API key (input is hidden): ";
		enteredKey = options.promptFn
			? await options.promptFn()
			: await promptHiddenInputInTerminal(prompt);

		const validation = validateGroqKeyFormat(enteredKey);
		if (!validation.valid) {
			io.writeErr(`\n❌ ${validation.error ?? "Invalid key"}. Please try again.\n`);
			enteredKey = "";
			continue;
		}

		if (validation.warning) {
			io.writeln(`\n⚠️  ${validation.warning}`);
		}
	}

	saveGroqApiKey(enteredKey, options.manager, options.model);
	io.writeln(`\n✔ Groq API key saved successfully (${maskApiKey(enteredKey)}). Starting Shri...\n`);

	return enteredKey;
}
