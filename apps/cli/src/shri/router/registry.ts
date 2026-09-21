import type { ModelMetadata } from "../types";

export const GROQ_MODELS: Record<string, ModelMetadata> = {
	"openai/gpt-oss-120b": {
		modelId: "openai/gpt-oss-120b",
		provider: "groq",
		contextWindow: 131072,
		maxOutputTokens: 65536,
		supportsToolCalling: true,
		reasoningTier: "high",
		tokensPerMinute: 8000,
		requestsPerMinute: 30,
		dailyTokenCeiling: 200000,
	},
	"llama-3.3-70b-versatile": {
		modelId: "llama-3.3-70b-versatile",
		provider: "groq",
		contextWindow: 128000,
		maxOutputTokens: 32768,
		supportsToolCalling: true,
		reasoningTier: "high",
		tokensPerMinute: 12000,
		requestsPerMinute: 30,
		dailyRequestCeiling: 1000,
	},
	"llama-3.1-8b-instant": {
		modelId: "llama-3.1-8b-instant",
		provider: "groq",
		contextWindow: 128000,
		maxOutputTokens: 8192,
		supportsToolCalling: true,
		reasoningTier: "low",
		tokensPerMinute: 30000,
		requestsPerMinute: 30,
		dailyRequestCeiling: 14400,
	},
};
