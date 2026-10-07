import type { GatewayProviderMetadata } from "@cline/shared";

/**
 * Groq reasoning policy, per https://console.groq.com/docs/reasoning
 * (checked 07/10/2026):
 * - Prior reasoning must not be replayed in later requests.
 * - Reasoning controls are model-specific, so only catalog-advertised
 *   controls are sent; unknown and non-reasoning models get none.
 * - `include_reasoning` is documented for GPT-OSS 20B and 120B only.
 */
export const GROQ_ROUTING_METADATA: GatewayProviderMetadata = {
	routing: {
		reasoningHistory: "omit",
		reasoningRequiresKnownControls: true,
		reasoning: {
			format: "include-reasoning",
			routes: [
				{ matcher: "model-id", modelId: "openai/gpt-oss-120b" },
				{ matcher: "model-id", modelId: "openai/gpt-oss-20b" },
			],
		},
	},
};
