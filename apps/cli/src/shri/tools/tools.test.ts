import { describe, expect, it } from "vitest";
import { getCompactToolRegistry } from "./compact-registry";
import { assignToolsForTask } from "./tool-assignment";

describe("Compact Tool Registry & Dynamic Assignment", () => {
	it("returns compact capability strings without heavy schemas", () => {
		const registry = getCompactToolRegistry();
		expect(registry).toContain("fs.read → filesystem / read-only");
		expect(registry).toContain("git.log → git / read-only");
		expect(registry).toContain("shell.exec → system / state-changing");
	});

	it("assigns only read tools when task requires git analysis", () => {
		const tools = assignToolsForTask({
			capabilities: ["git.log", "fs.read"],
			mutationAllowed: false,
		});

		expect(tools).toContain("git.log");
		expect(tools).toContain("fs.read");
		expect(tools).not.toContain("fs.write");
		expect(tools).not.toContain("shell.exec");
	});

	it("blocks state-changing tools if mutation is not permitted", () => {
		const tools = assignToolsForTask({
			capabilities: ["fs.write", "shell.exec", "fs.read"],
			mutationAllowed: false,
		});

		// Only read tool should be granted
		expect(tools).toContain("fs.read");
		expect(tools).not.toContain("fs.write");
		expect(tools).not.toContain("shell.exec");
	});

	it("permits state-changing tools when mutation is explicitly allowed", () => {
		const tools = assignToolsForTask({
			capabilities: ["fs.write", "shell.exec"],
			mutationAllowed: true,
		});

		expect(tools).toContain("fs.write");
		expect(tools).toContain("shell.exec");
	});
});
