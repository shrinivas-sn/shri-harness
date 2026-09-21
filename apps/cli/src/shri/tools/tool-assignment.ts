import { REGISTERED_TOOLS } from "./compact-registry";

export interface ToolAssignmentOptions {
	capabilities: string[];
	mutationAllowed: boolean;
}

/**
 * Dynamically assigns only needed tools to an ephemeral sub-agent (Section 13 & 14).
 * Enforces mutation permission boundary strictly.
 */
export function assignToolsForTask(options: ToolAssignmentOptions): string[] {
	const { capabilities, mutationAllowed } = options;
	const assigned: string[] = [];

	for (const capId of capabilities) {
		const meta = REGISTERED_TOOLS.find((t) => t.id === capId);
		if (!meta) continue;

		// Block state-changing tools if mutation is not permitted
		if (meta.mode === "state-changing" && !mutationAllowed) {
			continue;
		}

		assigned.push(meta.id);
	}

	return assigned;
}
