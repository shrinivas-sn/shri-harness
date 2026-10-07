import { describe, expect, it, vi } from "vitest";
import type { DiscoveryFetch } from "../../utils/groq-model-discovery";
import type { Config } from "../../utils/types";
import {
	AVAILABILITY_NOT_VERIFIED,
	applyModelSelection,
	DiscoveryGate,
	loadGroqModelChoices,
	type PickerModel,
	pickModelSelection,
	selectGroqPickerModels,
} from "./groq-model-selection";

const STORED_KEY = "gsk-stored-key-must-not-be-used";
const TEMP_KEY = "gsk-temporary-session-key";

function groqConfig(overrides: Partial<Config> = {}): Config {
	return {
		providerId: "groq",
		modelId: "openai/gpt-oss-120b",
		apiKey: TEMP_KEY,
		thinking: true,
		reasoningEffort: "high",
		knownModels: {
			"openai/gpt-oss-120b": {
				id: "openai/gpt-oss-120b",
				name: "GPT OSS 120B",
				capabilities: ["tools", "reasoning"],
			},
			"llama-3.1-8b-instant": {
				id: "llama-3.1-8b-instant",
				name: "Llama 3.1 8B",
				capabilities: ["tools"],
			},
			"catalog-only": {
				id: "catalog-only",
				name: "Catalog only",
				capabilities: ["tools"],
			},
			"whisper-large-v3": {
				id: "whisper-large-v3",
				operation: "transcription",
			},
		},
		...overrides,
	} as Config;
}

function settingsWith(stored: Record<string, unknown> | undefined) {
	return {
		getProviderSettings: vi.fn(() =>
			stored ? { provider: "groq", ...stored } : undefined,
		),
	} as never;
}

function listing(ids: string[]) {
	return vi.fn<DiscoveryFetch>(
		async () =>
			new Response(JSON.stringify({ data: ids.map((id) => ({ id })) }), {
				status: 200,
			}),
	);
}

describe("Groq model selection", () => {
	describe("discovery wiring", () => {
		it("uses the session's effective key over the stored key, with the stored endpoint and headers", async () => {
			const fetch = listing(["openai/gpt-oss-120b"]);

			await loadGroqModelChoices({
				config: groqConfig(),
				settings: settingsWith({
					apiKey: STORED_KEY,
					baseUrl: "https://proxy.example/groq/v1",
					headers: { "X-Team": "t1" },
				}),
				fetch,
			});

			expect(fetch).toHaveBeenCalledTimes(1);
			const [url, init] = fetch.mock.calls[0];
			expect(url).toBe("https://proxy.example/groq/v1/models");
			expect(init.headers).toEqual({
				"X-Team": "t1",
				Authorization: `Bearer ${TEMP_KEY}`,
			});
			expect(JSON.stringify(init)).not.toContain(STORED_KEY);
		});

		it("falls back to the stored key and the builtin Groq endpoint like inference does", async () => {
			const fetch = listing([]);

			await loadGroqModelChoices({
				config: groqConfig({ apiKey: "" }),
				settings: settingsWith({ apiKey: STORED_KEY }),
				fetch,
			});

			const [url, init] = fetch.mock.calls[0];
			expect(url).toBe("https://api.groq.com/openai/v1/models");
			expect(init.headers).toEqual({ Authorization: `Bearer ${STORED_KEY}` });
		});

		it("does not write settings or change the session config", async () => {
			const config = groqConfig();
			const before = structuredClone({
				modelId: config.modelId,
				apiKey: config.apiKey,
				thinking: config.thinking,
				reasoningEffort: config.reasoningEffort,
			});
			const settings = {
				getProviderSettings: vi.fn(() => undefined),
				saveProviderSettings: vi.fn(),
			};

			await loadGroqModelChoices({
				config,
				settings: settings as never,
				fetch: listing(["openai/gpt-oss-120b"]),
			});

			expect(settings.saveProviderSettings).not.toHaveBeenCalled();
			expect({
				modelId: config.modelId,
				apiKey: config.apiKey,
				thinking: config.thinking,
				reasoningEffort: config.reasoningEffort,
			}).toEqual(before);
		});
	});

	describe("picker choices", () => {
		it("offers only endpoint-listed, catalog-proven models; catalog-only is excluded", async () => {
			const config = groqConfig();
			const choices = await loadGroqModelChoices({
				config,
				settings: settingsWith(undefined),
				fetch: listing([
					"llama-3.1-8b-instant",
					"openai/gpt-oss-120b",
					"whisper-large-v3",
					"meta-llama/llama-guard-4-12b",
				]),
			});

			const view = selectGroqPickerModels(choices, config.knownModels);

			expect(Object.keys(view.models).sort()).toEqual([
				"llama-3.1-8b-instant",
				"openai/gpt-oss-120b",
			]);
			expect(view.notice).toMatch(/1 listed model lacks capability data/);
		});

		it("keeps an empty successful listing empty, with no stale catalog choices", async () => {
			const config = groqConfig();
			const choices = await loadGroqModelChoices({
				config,
				settings: settingsWith(undefined),
				fetch: listing([]),
			});

			const view = selectGroqPickerModels(choices, config.knownModels);

			expect(choices).toMatchObject({ status: "verified", eligibleIds: [] });
			expect(view.models).toEqual({});
			expect(view.notice).toMatch(/listed no models/);
		});

		it("on failure keeps cached catalog choices labelled as not verified", async () => {
			const config = groqConfig();
			const choices = await loadGroqModelChoices({
				config,
				settings: settingsWith(undefined),
				fetch: vi.fn<DiscoveryFetch>(
					async () => new Response("{}", { status: 401 }),
				),
			});

			const view = selectGroqPickerModels(choices, config.knownModels);

			expect(choices).toMatchObject({ status: "unverified", kind: "auth" });
			expect(view.models).toBe(config.knownModels);
			expect(view.notice).toContain(AVAILABILITY_NOT_VERIFIED);
			expect(view.notice).not.toContain(TEMP_KEY);
			expect(config.modelId).toBe("openai/gpt-oss-120b");
		});
	});

	describe("stale discovery", () => {
		it("ignores a late response from a superseded run and aborts it", async () => {
			const gate = new DiscoveryGate();
			const oldRun = gate.begin();
			const newRun = gate.begin();

			expect(oldRun.signal.aborted).toBe(true);
			expect(oldRun.isCurrent()).toBe(false);
			expect(newRun.isCurrent()).toBe(true);
		});

		it("drops a late old-provider listing after the provider changed", async () => {
			const gate = new DiscoveryGate();
			let release: (response: Response) => void = () => {};
			const slowFetch = vi.fn<DiscoveryFetch>(
				() =>
					new Promise<Response>((resolve) => {
						release = resolve;
					}),
			);
			const run = gate.begin();
			const pending = loadGroqModelChoices({
				config: groqConfig(),
				settings: settingsWith(undefined),
				fetch: slowFetch,
				signal: run.signal,
			});

			gate.cancel(); // closed, or switched away from Groq
			release(
				new Response(JSON.stringify({ data: [{ id: "late-model" }] }), {
					status: 200,
				}),
			);

			expect(await pending).toMatchObject({ status: "unverified" });
			expect(run.isCurrent()).toBe(false);
		});
	});

	describe("transactional selection", () => {
		const models: PickerModel[] = [
			{
				key: "openai/gpt-oss-120b",
				name: "GPT OSS 120B",
				supportsReasoning: true,
			},
			{
				key: "openai/gpt-oss-20b",
				name: "GPT OSS 20B",
				supportsReasoning: true,
			},
			{ key: "llama-3.1-8b-instant", name: "Llama", supportsReasoning: false },
		];

		it("Escape in the reasoning dialog leaves model and effort untouched", async () => {
			const config = groqConfig();
			const chooseModel = vi
				.fn()
				.mockResolvedValueOnce({ kind: "model", key: "openai/gpt-oss-20b" })
				.mockResolvedValueOnce(undefined);
			const chooseThinking = vi.fn(async () => {
				expect(config.modelId).toBe("openai/gpt-oss-120b");
				return undefined;
			});

			const result = await pickModelSelection({
				config,
				models,
				chooseModel,
				chooseThinking,
			});

			expect(result).toEqual({ kind: "cancelled" });
			expect(chooseModel).toHaveBeenCalledTimes(2);
			expect(chooseThinking).toHaveBeenCalledWith(models[1], "high");
			expect(config.modelId).toBe("openai/gpt-oss-120b");
			expect(config.thinking).toBe(true);
			expect(config.reasoningEffort).toBe("high");
		});

		it("stages a reasoning choice without mutating config", async () => {
			const config = groqConfig();

			const result = await pickModelSelection({
				config,
				models,
				chooseModel: async () => ({ kind: "model", key: "openai/gpt-oss-20b" }),
				chooseThinking: async () => "low",
			});

			expect(result).toEqual({
				kind: "selected",
				selection: {
					modelId: "openai/gpt-oss-20b",
					thinking: true,
					reasoningEffort: "low",
				},
			});
			expect(config.modelId).toBe("openai/gpt-oss-120b");
			expect(config.reasoningEffort).toBe("high");
		});

		it("clears reasoning for non-reasoning and manually entered models", async () => {
			for (const key of ["llama-3.1-8b-instant", "manual/unlisted-model"]) {
				const chooseThinking = vi.fn();
				const result = await pickModelSelection({
					config: groqConfig(),
					models,
					chooseModel: async () => ({ kind: "model", key }),
					chooseThinking,
				});

				expect(result).toEqual({
					kind: "selected",
					selection: {
						modelId: key,
						thinking: false,
						reasoningEffort: undefined,
					},
				});
				expect(chooseThinking).not.toHaveBeenCalled();
			}
		});

		it("skips the reasoning dialog for models that advertise no effort levels", async () => {
			const chooseThinking = vi.fn();
			const result = await pickModelSelection({
				config: groqConfig(),
				models: [
					{
						key: "qwen/qwen3.6-27b",
						name: "Qwen3.6 27B",
						supportsReasoning: true,
						reasoningEfforts: [],
					},
				],
				chooseModel: vi
					.fn()
					.mockResolvedValueOnce({ kind: "model", key: "qwen/qwen3.6-27b" })
					.mockResolvedValue(undefined),
				chooseThinking,
			});

			expect(chooseThinking).not.toHaveBeenCalled();
			expect(result).toEqual({
				kind: "selected",
				selection: {
					modelId: "qwen/qwen3.6-27b",
					thinking: false,
					reasoningEffort: undefined,
				},
			});
		});

		it("maps Off to thinking disabled", async () => {
			const result = await pickModelSelection({
				config: groqConfig(),
				models,
				chooseModel: async () => ({ kind: "model", key: "openai/gpt-oss-20b" }),
				chooseThinking: async () => "none",
			});

			expect(result).toMatchObject({
				selection: { thinking: false, reasoningEffort: undefined },
			});
		});

		it("passes provider change through without staging anything", async () => {
			const config = groqConfig();
			const result = await pickModelSelection({
				config,
				models,
				chooseModel: async () => ({ kind: "change-provider" }),
				chooseThinking: vi.fn(),
			});

			expect(result).toEqual({ kind: "change-provider" });
			expect(config.modelId).toBe("openai/gpt-oss-120b");
		});

		it("commits a staged selection through the apply callback", async () => {
			const config = groqConfig();
			const apply = vi.fn(async () => {
				expect(config.modelId).toBe("llama-3.1-8b-instant");
			});

			const result = await applyModelSelection(
				config,
				{
					modelId: "llama-3.1-8b-instant",
					thinking: false,
					reasoningEffort: undefined,
				},
				apply,
			);

			expect(result).toEqual({ ok: true });
			expect(apply).toHaveBeenCalledTimes(1);
			expect(config.modelId).toBe("llama-3.1-8b-instant");
			expect(config.thinking).toBe(false);
			expect(config.reasoningEffort).toBeUndefined();
			expect(config.apiKey).toBe(TEMP_KEY);
		});

		it("restores model and effort when applying fails", async () => {
			const config = groqConfig();
			const failure = new Error("restart failed");

			const result = await applyModelSelection(
				config,
				{
					modelId: "openai/gpt-oss-20b",
					thinking: true,
					reasoningEffort: "low",
				},
				async () => {
					throw failure;
				},
			);

			expect(result).toEqual({ ok: false, error: failure });
			expect(config.modelId).toBe("openai/gpt-oss-120b");
			expect(config.thinking).toBe(true);
			expect(config.reasoningEffort).toBe("high");
			expect(config.apiKey).toBe(TEMP_KEY);
		});
	});
});
