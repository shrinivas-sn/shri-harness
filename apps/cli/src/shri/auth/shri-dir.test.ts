import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolveShriHomeDir, initShriEnvironment } from "./shri-dir";
import {
	resolveClineDataDir,
	resolveClineDir,
	resolveDbDataDir,
	resolveGlobalSettingsPath,
	resolveMcpSettingsPath,
	resolveProviderSettingsPath,
	resolveSessionDataDir,
} from "@cline/shared/storage";

describe("Shri Directory Isolation", () => {
	const originalShriDir = process.env.SHRI_DIR;
	const stateEnvKeys = [
		"CLINE_DIR",
		"CLINE_DATA_DIR",
		"CLINE_SESSION_DATA_DIR",
		"CLINE_TEAM_DATA_DIR",
		"CLINE_CONNECTOR_DATA_DIR",
		"CLINE_DB_DATA_DIR",
		"CLINE_PROVIDER_SETTINGS_PATH",
		"CLINE_GLOBAL_SETTINGS_PATH",
		"CLINE_MCP_SETTINGS_PATH",
	] as const;
	const originalStateEnv = Object.fromEntries(
		stateEnvKeys.map((key) => [key, process.env[key]]),
	) as Record<(typeof stateEnvKeys)[number], string | undefined>;

	beforeEach(() => {
		delete process.env.SHRI_DIR;
	});

	afterEach(() => {
		if (originalShriDir !== undefined) {
			process.env.SHRI_DIR = originalShriDir;
		} else {
			delete process.env.SHRI_DIR;
		}
		for (const key of stateEnvKeys) {
			const value = originalStateEnv[key];
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
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

	it("gives an explicit config directory priority over SHRI_DIR", () => {
		process.env.SHRI_DIR = "/custom/shri/path";
		expect(resolveShriHomeDir("/explicit/shri/config")).toBe(
			"/explicit/shri/config",
		);
	});

	it("initializes Shri environment by pointing Cline storage to ~/.shri", () => {
		const shriDir = resolveShriHomeDir();
		initShriEnvironment();
		expect(resolveClineDir()).toBe(shriDir);
	});

	it("overrides inherited Cline storage paths and propagates Shri paths to children", () => {
		process.env.CLINE_DIR = "/inherited/.cline";
		process.env.CLINE_DATA_DIR = "/inherited/.cline/data";
		process.env.CLINE_SESSION_DATA_DIR = "/inherited/.cline/data/sessions";
		process.env.CLINE_DB_DATA_DIR = "/inherited/.cline/data/db";
		process.env.CLINE_PROVIDER_SETTINGS_PATH = "/inherited/providers.json";
		process.env.CLINE_GLOBAL_SETTINGS_PATH = "/inherited/global-settings.json";
		process.env.CLINE_MCP_SETTINGS_PATH = "/inherited/cline_mcp_settings.json";

		initShriEnvironment("/isolated/shri");

		expect(process.env.CLINE_DIR).toBe("/isolated/shri");
		expect(resolveClineDataDir()).toBe(join("/isolated/shri", "data"));
		expect(resolveSessionDataDir()).toBe(
			join("/isolated/shri", "data", "sessions"),
		);
		expect(resolveDbDataDir()).toBe(join("/isolated/shri", "data", "db"));
		expect(resolveProviderSettingsPath()).toBe(
			join("/isolated/shri", "data", "settings", "providers.json"),
		);
		expect(resolveGlobalSettingsPath()).toBe(
			join("/isolated/shri", "data", "settings", "global-settings.json"),
		);
		expect(resolveMcpSettingsPath()).toBe(
			join(
				"/isolated/shri",
				"data",
				"settings",
				"cline_mcp_settings.json",
			),
		);
	});
});
