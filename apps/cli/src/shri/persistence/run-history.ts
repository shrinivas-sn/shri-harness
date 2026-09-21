export interface RunRecord {
	runId: string;
	timestamp: string;
	userRequest: string;
	approvedPlanId: string;
	modelsUsed: string[];
	toolsAssigned: string[];
	tokensConsumed: number;
	status: "completed" | "failed" | "aborted";
	finalSummary: string;
	error?: string;
}

/**
 * Serializes run record into formatted JSON for local audit persistence (Section 24).
 */
export function serializeRunRecord(record: RunRecord): string {
	return JSON.stringify(record, null, 2);
}

/**
 * Formats a run record for terminal observability display (Section 23).
 */
export function formatRunRecord(record: RunRecord): string {
	return [
		`Run ID: ${record.runId}`,
		`Timestamp: ${record.timestamp}`,
		`Request: ${record.userRequest}`,
		`Models: ${record.modelsUsed.join(", ")}`,
		`Tools: ${record.toolsAssigned.join(", ")}`,
		`Tokens Used: ${record.tokensConsumed}`,
		`Status: ${record.status}`,
		`Summary: ${record.finalSummary}`,
	].join("\n");
}
