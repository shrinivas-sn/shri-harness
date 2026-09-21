export interface ContextPacketInput {
	taskId: string;
	title: string;
	contextRequirement: string;
	allowedTools: string[];
	constraints: string[];
}

export interface ContextPacket {
	taskId: string;
	title: string;
	contextRequirement: string;
	allowedTools: string[];
	constraints: string[];
}

/**
 * Builds minimal task-specific context packets (Section 8).
 * Isolates sub-agents from full chat history to save tokens and avoid hallucinations.
 */
export function buildContextPacket(input: ContextPacketInput): ContextPacket {
	return {
		taskId: input.taskId,
		title: input.title,
		contextRequirement: input.contextRequirement,
		allowedTools: [...input.allowedTools],
		constraints: [...input.constraints],
	};
}
