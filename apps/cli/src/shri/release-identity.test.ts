import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

describe("Shri release identity", () => {
	it("keeps the internal workspace name so bun -F filters keep working", () => {
		expect(packageJson.name).toBe("@cline/cli");
	});

	it("presents as Shri, not Cline, to anything reading displayName", () => {
		expect(packageJson.displayName).toBe("shri");
	});

	it("is private so it can never be npm-published directly", () => {
		expect(packageJson.private).toBe(true);
	});

	it("exposes the shri binary, not cline", () => {
		expect(packageJson.bin).toEqual({ shri: "src/index.ts" });
	});
});
