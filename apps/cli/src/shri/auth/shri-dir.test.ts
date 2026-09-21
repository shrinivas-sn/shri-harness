import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveShriHomeDir, initShriEnvironment } from "./shri-dir";
import { resolveClineDir } from "@cline/shared/storage";

describe("Shri Directory Isolation", () => {
	const originalShriDir = process.env.SHRI_DIR;

	beforeEach(() => {
		delete process.env.SHRI_DIR;
	});

	afterEach(() => {
		if (originalShriDir !== undefined) {
			process.env.SHRI_DIR = originalShriDir;
		} else {
			delete process.env.SHRI_DIR;
		}
	});

	it("resolves default directory to ~/.shri", () => {
		const expected = join(homedir(), ".shri");
		expect(resolveShriHomeDir()).toBe(expected);
	});

	it("respects SHRI_DIR environment override", () => {
		process.env.SHRI_DIR = "/custom/shri/path";
		expect(resolveShriHomeDir()).toBe("/custom/shri/path");
	});

	it("initializes Shri environment by pointing Cline storage to ~/.shri", () => {
		const shriDir = resolveShriHomeDir();
		initShriEnvironment();
		expect(resolveClineDir()).toBe(shriDir);
	});
});
