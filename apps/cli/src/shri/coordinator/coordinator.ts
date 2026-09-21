import { type Plan, PlanSchema, type SubAgentEnvelope } from "../types";

export interface SynthesisInput {
	userGoal: string;
	envelopes: SubAgentEnvelope[];
}

/**
 * Coordinator manages upfront task planning and final response synthesis (Sections 5, 6, 16, 21).
 */
export class Coordinator {
	/**
	 * Parses and validates raw LLM output into a strict Plan object.
	 */
	public parsePlanOutput(rawOutput: string): Plan {
		let cleaned = rawOutput.trim();

		// Strip markdown code fences if model included them
		if (cleaned.startsWith("```json")) {
			cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
		} else if (cleaned.startsWith("```")) {
			cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
		}

		const parsedJson = JSON.parse(cleaned);
		return PlanSchema.parse(parsedJson);
	}

	/**
	 * Synthesizes final answer from all sub-agent return envelopes.
	 */
	public synthesizeFinalAnswer(input: SynthesisInput): string {
		const { userGoal, envelopes } = input;
		const sections: string[] = [];

		sections.push(`### Execution Summary for: "${userGoal}"\n`);

		for (let i = 0; i < envelopes.length; i++) {
			const env = envelopes[i];
			const statusIcon = env.status === "success" ? "✅" : "⚠️";
			sections.push(`${statusIcon} **Task ${i + 1} Result**: ${env.summary}`);
			if (env.evidence) {
				sections.push(`   *Evidence*: ${env.evidence}`);
			}
			if (env.warnings.length > 0) {
				sections.push(`   *Warnings*: ${env.warnings.join(", ")}`);
			}
		}

		return sections.join("\n");
	}
}
