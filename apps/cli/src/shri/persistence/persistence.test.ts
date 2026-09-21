import { describe, expect, it } from "vitest";
import { type RunRecord, formatRunRecord, serializeRunRecord } from "./run-history";

describe("Run Persistence & Audit Logging", () => {
	it("serializes a complete run record to JSON format", () => {
		const record: RunRecord = {
			runId: "run-001",
			timestamp: "2026-09-21T18:00:00.000Z",
			userRequest: "Analyze git commit history",
			approvedPlanId: "plan-123",
			modelsUsed: ["openai/gpt-oss-120b", "llama-3.1-8b-instant"],
			toolsAssigned: ["git.log", "fs.read"],
			tokensConsumed: 1450,
			status: "completed",
			finalSummary: "Successfully inspected 5 commits",
		};

		const serialized = serializeRunRecord(record);
		expect(serialized).toContain('"runId": "run-001"');
		expect(serialized).toContain('"tokensConsumed": 1450');
	});

	it("formats a run record for terminal observability display", () => {
		const record: RunRecord = {
			runId: "run-002",
			timestamp: "2026-09-21T18:00:00.000Z",
			userRequest: "Run tests",
			approvedPlanId: "plan-456",
			modelsUsed: ["llama-3.1-8b-instant"],
			toolsAssigned: ["shell.exec"],
			tokensConsumed: 800,
			status: "completed",
			finalSummary: "All 14 tests passing",
		};

		const formatted = formatRunRecord(record);
		expect(formatted).toContain("Run ID: run-002");
		expect(formatted).toContain("Tokens Used: 800");
		expect(formatted).toContain("Status: completed");
	});
});
