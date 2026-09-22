import packageJson from "../../package.json";
import { describe, expect, it } from "vitest";
import { createProgram } from "../commands/program";

describe("Shri preview source identity", () => {
	it("keeps the workspace package private while exposing Shri help and preview version", () => {
		expect(packageJson.name).toBe("@cline/cli");
		expect(packageJson.private).toBe(true);
		expect(packageJson.displayName).toBe("shri");
		expect(packageJson.version).toMatch(/^0\.1\.0-next\.\d+$/);
		expect(createProgram().helpInformation()).toContain("Shri CLI");
	});
});
