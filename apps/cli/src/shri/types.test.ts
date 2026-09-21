import { describe, expect, it } from "vitest";
import {
	PlanSchema,
	SubAgentEnvelopeSchema,
	TaskRequirementProfileSchema,
} from "./types";

describe("Shri Core Schemas", () => {
	it("validates a valid TaskRequirementProfile", () => {
		const profile = {
			taskId: "task-1",
			title: "Inspect repository git commits",
			reasoning: "low",
			contextRequirement: "git history only",
			expectedOutputSize: "medium",
			priority: "high",
			requiredCapabilities: ["git.log", "fs.read"],
		};

		const result = TaskRequirementProfileSchema.safeParse(profile);
		expect(result.success).toBe(true);
	});

	it("rejects an invalid reasoning level in TaskRequirementProfile", () => {
		const invalidProfile = {
			taskId: "task-1",
			title: "Invalid task",
			reasoning: "extreme", // Not allowed: only low | medium | high
			contextRequirement: "none",
			expectedOutputSize: "small",
			priority: "low",
			requiredCapabilities: [],
		};

		const result = TaskRequirementProfileSchema.safeParse(invalidProfile);
		expect(result.success).toBe(false);
	});

	it("validates a complete Upfront Plan", () => {
		const plan = {
			planId: "plan-123",
			userGoal: "Analyze the last 5 commits",
			tasks: [
				{
					taskId: "task-1",
					title: "Extract git commits",
					reasoning: "low",
					contextRequirement: "git log",
					expectedOutputSize: "small",
					priority: "high",
					requiredCapabilities: ["git.log"],
					dependencies: [],
					assignedModel: "llama-3.1-8b-instant",
					assignedTools: ["git.log"],
					estimatedTokens: 800,
				},
			],
			estimatedTotalTokens: 1200,
			estimatedExecutionTimeSeconds: 5,
			verify: false,
		};

		const result = PlanSchema.safeParse(plan);
		expect(result.success).toBe(true);
	});

	it("validates a standardized SubAgentEnvelope", () => {
		const envelope = {
			status: "success",
			summary: "Found 5 recent commits in repository",
			evidence: "git log -n 5 output returned 5 hash entries",
			confidence: "high",
			warnings: [],
			resultPayload: {
				commits: ["feat: init", "docs: update"],
			},
		};

		const result = SubAgentEnvelopeSchema.safeParse(envelope);
		expect(result.success).toBe(true);
	});

	it("rejects an envelope with invalid status", () => {
		const invalidEnvelope = {
			status: "unknown_status",
			summary: "Failed run",
			evidence: "None",
			confidence: "low",
			warnings: [],
			resultPayload: {},
		};

		const result = SubAgentEnvelopeSchema.safeParse(invalidEnvelope);
		expect(result.success).toBe(false);
	});
});
