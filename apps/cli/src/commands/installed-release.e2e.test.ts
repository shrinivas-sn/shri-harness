import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const cliDir = resolve(import.meta.dirname, "..", "..");

describe.skipIf(process.platform !== "win32")(
	"installed Shri release on Windows",
	() => {
		it("rejects a non-native target without a stack trace", () => {
			const result = spawnSync(
				"cmd.exe",
				["/d", "/s", "/c", "bun script/smoke-installed.ts --target linux-x64"],
				{ cwd: cliDir, encoding: "utf8", timeout: 10_000 },
			);
			expect(result.status).toBe(1);
			expect(result.stderr).toContain("unsupported-host-target");
			expect(result.stderr).not.toContain("at fail (");
		});

		it("runs the actual tarballs through npm's shim and local npx in isolated state", () => {
			const result = spawnSync(
				"cmd.exe",
				[
					"/d",
					"/s",
					"/c",
					"bun script/smoke-installed.ts --target windows-x64",
				],
				{
					cwd: cliDir,
					encoding: "utf8",
					timeout: 120_000,
					maxBuffer: 1024 * 1024,
				},
			);
			expect(result.error).toBeUndefined();
			expect(result.status).toBe(0);
			const report = JSON.parse(result.stdout) as {
				target: string;
				checks: Record<string, boolean>;
			};
			expect(report.target).toBe("windows-x64");
			expect(report.checks).toMatchObject({
				hashes: true,
				install: true,
				shimVersion: true,
				npxVersion: true,
				help: true,
				missingKey: true,
				savedAuth: true,
				missingPlatform: true,
				hubStatusIsolated: true,
				stateIsolation: true,
				noBunPath: true,
			});
		});

		it("starts the installed terminal UI in a real PTY", {
			timeout: 60_000,
		}, () => {
			const result = spawnSync(
				"cmd.exe",
				[
					"/d",
					"/s",
					"/c",
					"bun script/smoke-installed.ts --target windows-x64 --pty",
				],
				{
					cwd: cliDir,
					encoding: "utf8",
					timeout: 50_000,
					maxBuffer: 1024 * 1024,
				},
			);
			expect(result.error).toBeUndefined();
			expect(result.status, result.stderr.trim().slice(0, 300)).toBe(0);
			const report = JSON.parse(result.stdout) as {
				checks: Record<string, boolean>;
			};
			expect(report.checks.tuiStartup).toBe(true);
			expect(report.checks.tuiSurvivesIdle).toBe(true);
			expect(report.checks.tuiShutdown).toBe(true);
			expect(report.checks.tuiNoHub).toBe(true);
			expect(report.checks.stateIsolation).toBe(true);
		});

		it("renders syntax-highlighted code in the installed terminal UI", {
			timeout: 70_000,
		}, () => {
			const result = spawnSync(
				"cmd.exe",
				[
					"/d",
					"/s",
					"/c",
					"bun script/smoke-installed.ts --target windows-x64 --render-pty",
				],
				{
					cwd: cliDir,
					encoding: "utf8",
					timeout: 60_000,
					maxBuffer: 1024 * 1024,
				},
			);
			expect(result.error).toBeUndefined();
			expect(result.status, result.stderr.trim().slice(0, 300)).toBe(0);
			const report = JSON.parse(result.stdout) as {
				checks: Record<string, boolean>;
			};
			expect(report.checks.markdownCodeRendered).toBe(true);
			expect(report.checks.renderNoHub).toBe(true);
			expect(report.checks.syntaxHighlighted).toBe(true);
		});

		it("starts and stops an isolated installed hub daemon", {
			timeout: 80_000,
		}, () => {
			const result = spawnSync(
				"cmd.exe",
				[
					"/d",
					"/s",
					"/c",
					"bun script/smoke-installed.ts --target windows-x64 --daemon",
				],
				{
					cwd: cliDir,
					encoding: "utf8",
					timeout: 70_000,
					maxBuffer: 1024 * 1024,
				},
			);
			expect(result.error).toBeUndefined();
			expect(result.status).toBe(0);
			const report = JSON.parse(result.stdout) as {
				checks: Record<string, boolean>;
			};
			expect(report.checks.daemonStarted).toBe(true);
			expect(report.checks.daemonStateIsolated).toBe(true);
			expect(report.checks.daemonStopped).toBe(true);
		});

		it("replaces then cancels saved Groq auth in the installed PTY", {
			timeout: 70_000,
		}, () => {
			const result = spawnSync(
				"cmd.exe",
				[
					"/d",
					"/s",
					"/c",
					"bun script/smoke-installed.ts --target windows-x64 --auth-pty",
				],
				{
					cwd: cliDir,
					encoding: "utf8",
					timeout: 60_000,
					maxBuffer: 1024 * 1024,
				},
			);
			expect(result.error).toBeUndefined();
			expect(result.status).toBe(0);
			const report = JSON.parse(result.stdout) as {
				checks: Record<string, boolean>;
			};
			expect(report.checks.authReplace).toBe(true);
			expect(report.checks.authCancel).toBe(true);
		});

		it("opens, searches, selects, and reopens the installed model picker", {
			timeout: 80_000,
		}, () => {
			const result = spawnSync(
				"cmd.exe",
				[
					"/d",
					"/s",
					"/c",
					"bun script/smoke-installed.ts --target windows-x64 --model-pty",
				],
				{
					cwd: cliDir,
					encoding: "utf8",
					timeout: 70_000,
					maxBuffer: 1024 * 1024,
				},
			);
			expect(result.error).toBeUndefined();
			expect(result.status).toBe(0);
			const report = JSON.parse(result.stdout) as {
				checks: Record<string, boolean>;
			};
			expect(report.checks.modelOpen).toBe(true);
			expect(report.checks.transcriptionFiltered).toBe(true);
			expect(report.checks.missingMetadataRendered).toBe(true);
			expect(report.checks.localCatalogRequested).toBe(true);
			expect(report.checks.fixtureTranscriptionFiltered).toBe(true);
			expect(report.checks.modelSelected).toBe(true);
			expect(report.checks.modelReopened).toBe(true);
		});

		it("uses CLI, environment, then saved Groq keys without persisting overrides", {
			timeout: 120_000,
		}, () => {
			const result = spawnSync(
				"cmd.exe",
				[
					"/d",
					"/s",
					"/c",
					"bun script/smoke-installed.ts --target windows-x64 --provider-fixture",
				],
				{
					cwd: cliDir,
					encoding: "utf8",
					timeout: 110_000,
					maxBuffer: 1024 * 1024,
				},
			);
			expect(result.error).toBeUndefined();
			expect(result.status).toBe(0);
			const report = JSON.parse(result.stdout) as {
				checks: Record<string, boolean>;
			};
			expect(report.checks.keyPrecedence).toBe(true);
			expect(report.checks.temporaryKeysNotPersisted).toBe(true);
			expect(report.checks.readFileTool).toBe(true);
			expect(report.checks.commandTool).toBe(true);
			expect(report.checks.invalidAuth).toBe(true);
			expect(report.checks.transientRecovery).toBe(true);
			expect(report.checks.interruptedStream).toBe(true);
			expect(report.checks.historyRestart).toBe(true);
			expect(report.checks.sessionStoreIsolated).toBe(true);
		});
	},
);
