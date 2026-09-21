import { describe, expect, it } from "vitest";
import { executeShriPipeline } from "./index";

describe("Shri V1 End-to-End Pipeline", () => {
	it("executes the complete 11-step orchestration flow with approval", async () => {
		const result = await executeShriPipeline({
			userRequest: "Analyze git commit history and project status",
			mutationAllowed: false,
			// Simulate user auto-approving the upfront plan
			onPlanReview: async (plan) => {
				expect(plan.planId).toBeDefined();
				expect(plan.tasks.length).toBeGreaterThan(0);
				return "Approve";
			},
			// Mock sub-agent runner to simulate tool execution
			mockTaskExecutor: async (task) => {
				return {
					status: "success" as const,
					summary: `Executed task: ${task.title}`,
					evidence: `Used tools: ${task.assignedTools.join(", ")}`,
					confidence: "high" as const,
					warnings: [],
					resultPayload: { completed: true },
				};
			},
		});

		expect(result.status).toBe("completed");
		expect(result.finalAnswer).toContain("Execution Summary");
		expect(result.tokensConsumed).toBeGreaterThan(0);
		expect(result.runRecord.status).toBe("completed");
	});

	it("aborts execution cleanly if user rejects the plan", async () => {
		const result = await executeShriPipeline({
			userRequest: "Reformat codebase",
			mutationAllowed: false,
			onPlanReview: async () => {
				return "Reject";
			},
		});

		expect(result.status).toBe("aborted");
		expect(result.finalAnswer).toContain("Plan was rejected by user");
	});
});
