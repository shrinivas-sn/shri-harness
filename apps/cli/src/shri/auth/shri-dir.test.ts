import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { resolveShriHomeDir, initShriEnvironment } from "./shri-dir";
import { resolveClineDir } from "@cline/shared/storage";

describe("Shri Directory Isolation", () => {
	const originalShriDir = process.env.SHRI_DIR;
	const originalClineDirEnv = process.env.CLINE_DIR;
	const tempDirs: string[] = [];

	beforeEach(() => {
		delete process.env.SHRI_DIR;
		delete process.env.CLINE_DIR;
	});

	afterEach(() => {
		if (originalShriDir !== undefined) {
			process.env.SHRI_DIR = originalShriDir;
		} else {
			delete process.env.SHRI_DIR;
		}
		if (originalClineDirEnv !== undefined) {
			process.env.CLINE_DIR = originalClineDirEnv;
		} else {
			delete process.env.CLINE_DIR;
		}
		for (const dir of tempDirs.splice(0)) {
			rmSync(dir, { recursive: true, force: true });
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

	it("propagates the resolved directory through CLINE_DIR so a spawned child/daemon inherits it", () => {
		// The hub daemon is spawned as a separate detached process that only
		// inherits process.env, not this process's in-memory CLINE_DIR module
		// state (set via setClineDir()). Without also setting process.env.CLINE_DIR,
		// a spawned daemon re-resolves resolveClineDir() from scratch and falls
		// back to ~/.cline, silently breaking Shri's storage isolation for any
		// daemon-backed feature (dashboard, schedule, connectors).
		const shriDir = resolveShriHomeDir();
		initShriEnvironment();
		expect(process.env.CLINE_DIR).toBe(shriDir);
	});

	it("propagates a SHRI_DIR override through CLINE_DIR as well", () => {
		const customDir = join(tmpdir(), "shri-dir-test-custom");
		process.env.SHRI_DIR = customDir;
		initShriEnvironment();
		expect(process.env.CLINE_DIR).toBe(customDir);
	});

	it("never writes into an existing .cline directory when isolated to ~/.shri", () => {
		const fakeHome = mkdtempSync(join(tmpdir(), "shri-dir-test-home-"));
		tempDirs.push(fakeHome);
		const sentinelDir = join(fakeHome, ".cline");
		const sentinelPath = join(sentinelDir, "sentinel.txt");
		mkdirSync(sentinelDir, { recursive: true });
		writeFileSync(sentinelPath, "untouched");

		const customShriDir = join(tmpdir(), "shri-dir-test-isolated-shri");
		process.env.SHRI_DIR = customShriDir;

		initShriEnvironment();

		expect(existsSync(sentinelPath)).toBe(true);
		expect(readFileSync(sentinelPath, "utf-8")).toBe("untouched");
		expect(resolveClineDir()).not.toBe(sentinelDir);
	});
});
