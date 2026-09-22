import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
	validateGroqKeyFormat,
	resolveGroqApiKey,
	saveGroqApiKey,
	ensureGroqApiKey,
	maskApiKey,
} from "./groq-auth";

describe("Groq Auth Management", () => {
	const originalGroqEnv = process.env.GROQ_API_KEY;

	beforeEach(() => {
		delete process.env.GROQ_API_KEY;
	});

	afterEach(() => {
		if (originalGroqEnv !== undefined) {
			process.env.GROQ_API_KEY = originalGroqEnv;
		} else {
			delete process.env.GROQ_API_KEY;
		}
	});

	describe("validateGroqKeyFormat", () => {
		it("rejects empty or whitespace-only keys", () => {
			expect(validateGroqKeyFormat("").valid).toBe(false);
			expect(validateGroqKeyFormat("   ").valid).toBe(false);
			expect(validateGroqKeyFormat("").error).toBeDefined();
		});

		it("warns if key does not start with standard prefix gsk_", () => {
			const result = validateGroqKeyFormat("custom_key_12345");
			expect(result.valid).toBe(true);
			expect(result.warning).toContain("gsk_");
		});

		it("accepts valid standard Groq API key", () => {
			const result = validateGroqKeyFormat("gsk_validKeyAbc1234567890");
			expect(result.valid).toBe(true);
			expect(result.warning).toBeUndefined();
			expect(result.error).toBeUndefined();
		});
	});

	describe("maskApiKey", () => {
		it("masks key showing only prefix and trailing characters", () => {
			expect(maskApiKey("gsk_1234567890abcdef")).toBe("gsk_...cdef");
		});

		it("handles short keys safely", () => {
			expect(maskApiKey("short")).toBe("****");
		});
	});

	describe("resolveGroqApiKey", () => {
		it("prioritizes GROQ_API_KEY from environment", () => {
			process.env.GROQ_API_KEY = "gsk_env_key";
			const mockManager = {
				getProviderSettings: vi.fn().mockReturnValue({ apiKey: "gsk_stored_key" }),
			} as any;
			expect(resolveGroqApiKey(mockManager)).toBe("gsk_env_key");
		});

		it("falls back to persisted settings if env is unset", () => {
			const mockManager = {
				getProviderSettings: vi.fn().mockReturnValue({ apiKey: "gsk_stored_key" }),
			} as any;
			expect(resolveGroqApiKey(mockManager)).toBe("gsk_stored_key");
		});

		it("ignores a blank environment override and falls back to persisted settings", () => {
			process.env.GROQ_API_KEY = "   ";
			const mockManager = {
				getProviderSettings: vi.fn().mockReturnValue({ apiKey: "gsk_stored_key" }),
			} as any;
			expect(resolveGroqApiKey(mockManager)).toBe("gsk_stored_key");
		});

		it("returns undefined when no key exists anywhere", () => {
			const mockManager = {
				getProviderSettings: vi.fn().mockReturnValue(undefined),
			} as any;
			expect(resolveGroqApiKey(mockManager)).toBeUndefined();
		});
	});

	describe("saveGroqApiKey", () => {
		it("saves key and default coordinator model into provider settings", () => {
			const saveFn = vi.fn();
			const mockManager = {
				getProviderSettings: vi.fn().mockReturnValue(undefined),
				saveProviderSettings: saveFn,
			} as any;

			saveGroqApiKey("gsk_test123", mockManager);

			expect(saveFn).toHaveBeenCalledWith(
				expect.objectContaining({
					provider: "groq",
					apiKey: "gsk_test123",
					model: "openai/gpt-oss-120b",
				}),
			);
		});
	});

	describe("ensureGroqApiKey", () => {
		it("returns existing key immediately without prompting", async () => {
			process.env.GROQ_API_KEY = "gsk_existing";
			const mockManager = { getProviderSettings: vi.fn() } as any;
			const promptFn = vi.fn();

			const key = await ensureGroqApiKey({
				manager: mockManager,
				isTTY: true,
				promptFn,
			});

			expect(key).toBe("gsk_existing");
			expect(promptFn).not.toHaveBeenCalled();
		});

		it("throws descriptive error when missing in non-TTY environment", async () => {
			const mockManager = {
				getProviderSettings: vi.fn().mockReturnValue(undefined),
			} as any;

			await expect(
				ensureGroqApiKey({
					manager: mockManager,
					isTTY: false,
				}),
			).rejects.toThrow(/No Groq API key found/i);
		});

		it("prompts, validates, and saves key in interactive TTY environment", async () => {
			const saveFn = vi.fn();
			const mockManager = {
				getProviderSettings: vi.fn().mockReturnValue(undefined),
				saveProviderSettings: saveFn,
			} as any;
			const promptFn = vi.fn().mockResolvedValue("gsk_new_entered_key");
			const writeln = vi.fn();

			const key = await ensureGroqApiKey({
				manager: mockManager,
				isTTY: true,
				promptFn,
				io: { writeln, writeErr: vi.fn() },
			});

			expect(key).toBe("gsk_new_entered_key");
			expect(promptFn).toHaveBeenCalledTimes(1);
			expect(saveFn).toHaveBeenCalledWith(
				expect.objectContaining({
					provider: "groq",
					apiKey: "gsk_new_entered_key",
				}),
			);
			expect(writeln).toHaveBeenCalledWith(
				expect.stringContaining("Groq API key saved"),
			);
		});

		it("replaces a saved key only when explicit reconfiguration is requested", async () => {
			const saveFn = vi.fn();
			const mockManager = {
				getProviderSettings: vi.fn().mockReturnValue({
					provider: "groq",
					apiKey: "gsk_saved_invalid_key",
					model: "meta-llama/llama-4-scout-17b-16e-instruct",
					extraSetting: "preserve-me",
				}),
				saveProviderSettings: saveFn,
			} as any;
			const promptFn = vi.fn().mockResolvedValue("gsk_replacement_key");

			const key = await ensureGroqApiKey({
				manager: mockManager,
				isTTY: true,
				promptFn,
				reconfigure: true,
				io: { writeln: vi.fn(), writeErr: vi.fn() },
			});

			expect(key).toBe("gsk_replacement_key");
			expect(promptFn).toHaveBeenCalledOnce();
			expect(saveFn).toHaveBeenCalledWith(
				expect.objectContaining({
					apiKey: "gsk_replacement_key",
					model: "meta-llama/llama-4-scout-17b-16e-instruct",
					extraSetting: "preserve-me",
				}),
			);
		});

		it("cancels explicit reconfiguration without changing saved settings", async () => {
			const saveFn = vi.fn();
			const mockManager = {
				getProviderSettings: vi.fn().mockReturnValue({
					provider: "groq",
					apiKey: "gsk_saved_key",
					model: "openai/gpt-oss-120b",
				}),
				saveProviderSettings: saveFn,
			} as any;

			const key = await ensureGroqApiKey({
				manager: mockManager,
				isTTY: true,
				promptFn: vi.fn().mockResolvedValue(undefined),
				reconfigure: true,
				io: { writeln: vi.fn(), writeErr: vi.fn() },
			});

			expect(key).toBeUndefined();
			expect(saveFn).not.toHaveBeenCalled();
		});

		it("does not let an environment key silently bypass explicit reconfiguration", async () => {
			process.env.GROQ_API_KEY = "gsk_environment_override";
			const writeln = vi.fn();
			const mockManager = {
				getProviderSettings: vi.fn().mockReturnValue({
					provider: "groq",
					apiKey: "gsk_saved_key",
				}),
				saveProviderSettings: vi.fn(),
			} as any;
			const promptFn = vi.fn().mockResolvedValue("gsk_replacement_key");

			await ensureGroqApiKey({
				manager: mockManager,
				isTTY: true,
				promptFn,
				reconfigure: true,
				io: { writeln, writeErr: vi.fn() },
			});

			expect(promptFn).toHaveBeenCalledOnce();
			expect(writeln).toHaveBeenCalledWith(
				expect.stringContaining("GROQ_API_KEY"),
			);
			expect(writeln).not.toHaveBeenCalledWith(
				expect.stringContaining("gsk_environment_override"),
			);
		});
	});
});
