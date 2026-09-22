import { homedir } from "node:os";
import { relative, sep } from "node:path";
import {
	getHomeDir,
	resolveClineDataDir,
	resolveClineDir,
	setHomeDir,
} from "@cline/shared/storage";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { initShriEnvironment } from "../shri/auth/shri-dir";
import { createProgram } from "./program";

/** Render an absolute path under `home` the way help text does: `~/...`. */
function tildePath(absolutePath: string, home: string): string {
	return `~/${relative(home, absolutePath).split(sep).join("/")}`;
}

describe("root option help text", () => {
	const FAKE_HOME = "/home/cline-help-test";
	const savedEnv: Record<string, string | undefined> = {};

	beforeAll(() => {
		// Pin the resolver inputs so the defaults below are the true defaults
		// (no CLINE_DIR/CLINE_DATA_DIR overrides, known home directory).
		for (const key of ["CLINE_DIR", "CLINE_DATA_DIR"]) {
			savedEnv[key] = process.env[key];
			delete process.env[key];
		}
		setHomeDir(FAKE_HOME);
	});

	afterAll(() => {
		for (const [key, value] of Object.entries(savedEnv)) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	});

	it("reports the actual resolver defaults for --config and --data-dir", () => {
		// A wide help width keeps each option description on one line so the
		// full default text can be matched.
		const help = createProgram()
			.configureHelp({ helpWidth: 500 })
			.helpInformation();

		const configDefault = tildePath(resolveClineDir(), FAKE_HOME);
		const dataDirDefault = tildePath(resolveClineDataDir(), FAKE_HOME);

		// Sanity-check the resolvers themselves so the assertions below can't
		// silently drift along with a resolver regression.
		expect(configDefault).toBe("~/.cline");
		expect(dataDirDefault).toBe("~/.cline/data");

		expect(help).toContain(
			`Configuration directory (default: ${configDefault})`,
		);
		expect(help).toContain(
			`Use isolated local state at this directory path (default: ${dataDirDefault})`,
		);
	});
});

describe("root option help text after Shri storage isolation initializes", () => {
	const originalHomeDir = getHomeDir();
	const originalShriDir = process.env.SHRI_DIR;
	const originalClineDirEnv = process.env.CLINE_DIR;

	afterEach(() => {
		setHomeDir(originalHomeDir);
		if (originalShriDir === undefined) {
			delete process.env.SHRI_DIR;
		} else {
			process.env.SHRI_DIR = originalShriDir;
		}
		if (originalClineDirEnv === undefined) {
			delete process.env.CLINE_DIR;
		} else {
			process.env.CLINE_DIR = originalClineDirEnv;
		}
	});

	it("shows ~/.shri, not ~/.cline, once initShriEnvironment() has run", () => {
		delete process.env.SHRI_DIR;
		delete process.env.CLINE_DIR;
		initShriEnvironment();

		const help = createProgram()
			.configureHelp({ helpWidth: 500 })
			.helpInformation();

		expect(help).toContain("Configuration directory (default: ~/.shri)");
		expect(help).toContain(
			"Directory path to additional hooks for runtime hook injection (default: ~/.shri/hooks)",
		);
		expect(help).toContain(
			"Auto-create a detached git worktree under ~/.shri/worktrees/ and run the task there",
		);
		// --data-dir derives from resolveClineDataDir(), which honors the test
		// suite's global CLINE_DATA_DIR sandbox pin (vitest.setup.ts) ahead of
		// resolveClineDir()+"data" — so it deliberately doesn't assert ~/.shri/data
		// here. Its ~/.shri-derived default is covered by the CLINE_DIR
		// propagation tests in shri-dir.test.ts instead.
	});

	it("shows the absolute SHRI_DIR override, not a tilde path, when one is set", () => {
		const customDir = `${homedir()}-shri-program-test-custom`;
		process.env.SHRI_DIR = customDir;
		initShriEnvironment();

		const help = createProgram()
			.configureHelp({ helpWidth: 500 })
			.helpInformation();

		expect(help).toContain(`Configuration directory (default: ${customDir})`);
	});
});
