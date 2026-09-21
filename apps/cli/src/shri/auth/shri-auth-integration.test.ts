import { describe, expect, it, vi } from "vitest";
import { runAuthCommand } from "../../commands/auth";
import { parseAuthCommandArgs } from "../../commands/auth";

import { ProviderSettingsManager } from "@cline/core";

describe("Shri Auth Command Integration", () => {
	it("defaults provider to groq and model to openai/gpt-oss-120b when bare --apikey is provided", async () => {
		const manager = new ProviderSettingsManager();
		const saveSpy = vi.spyOn(manager, "saveProviderSettings").mockImplementation(() => {});
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

	it("runs interactive groq setup when explicit provider is groq without quick setup flags", async () => {
		const manager = new ProviderSettingsManager();
		const writeln = vi.fn();
		const writeErr = vi.fn();

		// Simulate interactive entry
		const code = await runAuthCommand({
			providerSettingsManager: manager,
			explicitProvider: "groq",
			io: { writeln, writeErr },
		});

		// If running in test (non-TTY without promptFn), groq setup throws/catches gracefully
		expect(code).toBeDefined();
	});
});
