import type { ModelMetadata, ReasoningLevel } from "../types";
import { GROQ_MODELS } from "./registry";

export interface ModelSelectionCriteria {
	reasoning: ReasoningLevel;
	estimatedTokens: number;
}

/**
 * Model Router with capability matching and automatic fallback (Section 9 & 10).
 */
export class ModelRouter {
	private failureCounts: Map<string, number> = new Map();

	/**
	 * Selects an optimal model based on reasoning tier and current availability.
	 */
	public selectModel(criteria: ModelSelectionCriteria): ModelMetadata {
		const candidates = this.getCandidates(criteria.reasoning);

		// Find first candidate without active failures
		for (const modelId of candidates) {
			const failures = this.failureCounts.get(modelId) ?? 0;
			if (failures === 0 && GROQ_MODELS[modelId]) {
				return GROQ_MODELS[modelId];
			}
		}

		// Fallback: candidate with least failures
		let bestModelId = candidates[0] ?? "llama-3.1-8b-instant";
		let minFailures = Number.POSITIVE_INFINITY;
		for (const modelId of candidates) {
			const failures = this.failureCounts.get(modelId) ?? 0;
			if (failures < minFailures && GROQ_MODELS[modelId]) {
				minFailures = failures;
				bestModelId = modelId;
			}
		}

		return GROQ_MODELS[bestModelId] ?? GROQ_MODELS["llama-3.1-8b-instant"];
	}

	/**
	 * Prioritized candidate list based on required reasoning level.
	 */
	private getCandidates(reasoning: ReasoningLevel): string[] {
		switch (reasoning) {
			case "high":
				return ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
			case "medium":
				return ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "llama-3.1-8b-instant"];
			case "low":
			default:
				return ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
		}
	}

	/**
	 * Records a failure or rate limit hit against a model.
	 */
	public recordFailure(modelId: string): void {
		const current = this.failureCounts.get(modelId) ?? 0;
		this.failureCounts.set(modelId, current + 1);
	}

	/**
	 * Resets all failure counters.
	 */
	public resetFailures(): void {
		this.failureCounts.clear();
	}
}
