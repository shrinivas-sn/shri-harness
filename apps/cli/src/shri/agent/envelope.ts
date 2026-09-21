import { type SubAgentEnvelope, SubAgentEnvelopeSchema } from "../types";

/**
 * Parses raw JSON output into a validated SubAgentEnvelope (Section 22).
 */
export function parseSubAgentEnvelope(raw: string): SubAgentEnvelope {
	let cleaned = raw.trim();

	if (cleaned.startsWith("```json")) {
		cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
	} else if (cleaned.startsWith("```")) {
		cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
	}

	const parsed = JSON.parse(cleaned);
	return SubAgentEnvelopeSchema.parse(parsed);
}

/**
 * Formats a structured envelope into concise text for the Coordinator's context.
 */
export function formatEnvelopeForCoordinator(envelope: SubAgentEnvelope): string {
	return [
		`STATUS: ${envelope.status}`,
		`SUMMARY: ${envelope.summary}`,
		`EVIDENCE: ${envelope.evidence}`,
		`CONFIDENCE: ${envelope.confidence}`,
		envelope.warnings.length > 0 ? `WARNINGS: ${envelope.warnings.join(", ")}` : "",
	]
		.filter(Boolean)
		.join("\n");
}
