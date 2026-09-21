import { describe, expect, it } from "vitest";
import { GROQ_MODELS } from "./registry";
import { ModelRouter } from "./router";

describe("Model Registry & Router", () => {
	it("registers Groq models with capability metadata", () => {
		expect(GROQ_MODELS["openai/gpt-oss-120b"]).toBeDefined();
		expect(GROQ_MODELS["openai/gpt-oss-120b"].contextWindow).toBe(131072);
		expect(GROQ_MODELS["openai/gpt-oss-120b"].reasoningTier).toBe("high");

		expect(GROQ_MODELS["llama-3.1-8b-instant"]).toBeDefined();
		expect(GROQ_MODELS["llama-3.1-8b-instant"].reasoningTier).toBe("low");
	});

	it("routes high reasoning tasks to GPT-OSS-120B or Llama 3.3 70B", () => {
		const router = new ModelRouter();
		const model = router.selectModel({
			reasoning: "high",
			estimatedTokens: 2000,
		});

		expect(model.reasoningTier).toBe("high");
		expect(["openai/gpt-oss-120b", "llama-3.3-70b-versatile"]).toContain(model.modelId);
	});

	it("routes low reasoning lightweight tasks to Llama 3.1 8B", () => {
		const router = new ModelRouter();
		const model = router.selectModel({
			reasoning: "low",
			estimatedTokens: 500,
		});

		expect(model.modelId).toBe("llama-3.1-8b-instant");
	});

	it("falls back to secondary model when primary fails", () => {
		const router = new ModelRouter();

		// Mark gpt-oss-120b as failing/unavailable
		router.recordFailure("openai/gpt-oss-120b");

		const fallback = router.selectModel({
			reasoning: "high",
			estimatedTokens: 2000,
		});

		// Should automatically select Llama 3.3 70B instead
		expect(fallback.modelId).toBe("llama-3.3-70b-versatile");
	});

	it("resets failure cooldowns on explicit reset", () => {
		const router = new ModelRouter();
		router.recordFailure("openai/gpt-oss-120b");
		router.resetFailures();

		const selected = router.selectModel({
			reasoning: "high",
			estimatedTokens: 2000,
		});

		expect(selected.modelId).toBe("openai/gpt-oss-120b");
	});
});
