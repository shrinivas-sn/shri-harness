export interface ToolCapability {
	id: string;
	category: "filesystem" | "git" | "web" | "system";
	mode: "read-only" | "state-changing";
	description: string;
}

export const REGISTERED_TOOLS: ToolCapability[] = [
	{
		id: "fs.read",
		category: "filesystem",
		mode: "read-only",
		description: "read files and list directories",
	},
	{
		id: "fs.write",
		category: "filesystem",
		mode: "state-changing",
		description: "create and edit files",
	},
	{
		id: "git.log",
		category: "git",
		mode: "read-only",
		description: "inspect git commits, status, diffs",
	},
	{
		id: "web.search",
		category: "web",
		mode: "read-only",
		description: "search web documentation and resources",
	},
	{
		id: "shell.exec",
		category: "system",
		mode: "state-changing",
		description: "execute terminal commands and tests",
	},
];

/**
 * Formats the compact capability strings for the Coordinator prompt (Section 12).
 * Minimizes tokens by omitting parameter schemas.
 */
export function getCompactToolRegistry(): string {
	return REGISTERED_TOOLS.map(
		(tool) => `${tool.id} → ${tool.category} / ${tool.mode}`,
	).join("\n");
}

export function getToolCapabilitySummary(toolId: string): ToolCapability | undefined {
	return REGISTERED_TOOLS.find((t) => t.id === toolId);
}
