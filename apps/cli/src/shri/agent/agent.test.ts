import { describe, expect, it } from "vitest";
import { buildContextPacket } from "./context-packet";
import { formatEnvelopeForCoordinator, parseSubAgentEnvelope } from "./envelope";

describe("Sub-Agent Context Packet & Envelope", () => {
	it("builds an isolated context packet without unrelated history", () => {
		const packet = buildContextPacket({
			taskId: "task-1",
			title: "Inspect package.json dependencies",
			contextRequirement: "package.json contents only",
			allowedTools: ["fs.read"],
			constraints: ["Do not edit files"],
		});

		expect(packet.taskId).toBe("task-1");
		expect(packet.allowedTools).toEqual(["fs.read"]);
		expect(packet.constraints).toContain("Do not edit files");
	});

	it("parses valid envelope from sub-agent output", () => {
		const rawEnvelope = JSON.stringify({
			status: "success",
			summary: "Analyzed 12 dependencies",
			evidence: "package.json dependencies section parsed successfully",
			confidence: "high",
			warnings: [],
			resultPayload: { count: 12 },
		});

		const parsed = parseSubAgentEnvelope(rawEnvelope);
		expect(parsed.status).toBe("success");
		expect(parsed.confidence).toBe("high");
		expect(parsed.resultPayload.count).toBe(12);
	});

	it("formats envelope into a readable text block for Coordinator", () => {
		const envelope = {
			status: "success" as const,
			summary: "All tests passed",
			evidence: "Vitest reported 14/14 tests passing",
			confidence: "high" as const,
			warnings: [],
			resultPayload: {},
		};

		const formatted = formatEnvelopeForCoordinator(envelope);
		expect(formatted).toContain("STATUS: success");
		expect(formatted).toContain("SUMMARY: All tests passed");
		expect(formatted).toContain("EVIDENCE: Vitest reported 14/14 tests passing");
	});
});
