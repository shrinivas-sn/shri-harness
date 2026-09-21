import { describe, expect, it } from "vitest";
import { BudgetManager } from "./budget";
import { ExecutionScheduler } from "./scheduler";

describe("Budget Manager & Execution Scheduler", () => {
	it("tracks token consumption against daily quota", () => {
		const budget = new BudgetManager({
			dailyTokenCeiling: 200000,
			tokensPerMinute: 8000,
		});

		expect(budget.canAfford(5000)).toBe(true);
		budget.recordUsage(5000);

		expect(budget.getTokensConsumedToday()).toBe(5000);
		expect(budget.getRemainingTokensToday()).toBe(195000);
	});

	it("rejects tasks that exceed remaining daily budget", () => {
		const budget = new BudgetManager({
			dailyTokenCeiling: 10000,
			tokensPerMinute: 8000,
		});

		budget.recordUsage(9000);
		expect(budget.canAfford(2000)).toBe(false);
	});

	it("enforces model-aware concurrency", () => {
		const scheduler = new ExecutionScheduler();

		// Two heavy tasks for same model
		scheduler.registerRunningTask("task-1", "openai/gpt-oss-120b", "heavy");

		// Another heavy task for same model should NOT run concurrently
		expect(
			scheduler.canExecuteConcurrently("openai/gpt-oss-120b", "heavy"),
		).toBe(false);

		// But a light task on a different model CAN run concurrently
		expect(
			scheduler.canExecuteConcurrently("llama-3.1-8b-instant", "light"),
		).toBe(true);

		// When first task completes, second heavy task is unblocked
		scheduler.completeTask("task-1");
		expect(
			scheduler.canExecuteConcurrently("openai/gpt-oss-120b", "heavy"),
		).toBe(true);
	});
});
