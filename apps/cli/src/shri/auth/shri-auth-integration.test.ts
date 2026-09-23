import { describe, expect, it, vi } from "vitest";
import { runAuthCommand } from "../../commands/auth";

import { ProviderSettingsManager } from "@cline/core";

describe("Shri Auth Command Integration", () => {
	it("defaults provider to groq and model to openai/gpt-oss-120b when bare --apikey is provided", async () => {
		const manager = new ProviderSettingsManager();
		const saveSpy = vi
			.spyOn(manager, "saveProviderSettings")
			.mockImplementation(() => manager.read());
		const writeln = vi.fn();
		const writeErr = vi.fn();

		const code = await runAuthCommand({
			providerSettingsManager: manager,
			apikey: "gsk_test_api_key_12345",
			io: { writeln, writeErr },
		});

		expect(code).toBe(0);
		expect(saveSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: "groq",
				apiKey: "gsk_test_api_key_12345",
				model: "openai/gpt-oss-120b",
			}),
		);
		expect(writeln).toHaveBeenCalledWith(
			expect.stringContaining("groq"),
		);
	});

	it("uses explicit reconfiguration for bare Groq auth", async () => {
		const manager = new ProviderSettingsManager();
		const writeln = vi.fn();
		const writeErr = vi.fn();
		const ensureGroqApiKey = vi.fn().mockResolvedValue("gsk_replacement_key");

		const code = await runAuthCommand({
			providerSettingsManager: manager,
			explicitProvider: "groq",
			io: { writeln, writeErr },
			ensureGroqApiKey,
		});

		expect(code).toBe(0);
		expect(ensureGroqApiKey).toHaveBeenCalledWith(
			expect.objectContaining({
			manager,
			reconfigure: true,
		}),
		);
	});
});
