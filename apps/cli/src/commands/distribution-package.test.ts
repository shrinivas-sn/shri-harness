import { spawnSync } from "node:child_process";
import {
	chmod,
	mkdir,
	mkdtemp,
	readdir,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	DIRECT_PUBLISH_GUARD_MESSAGE,
	shouldAllowDirectPublish,
} from "../../script/guard-direct-publish";

describe("CLI distribution package shape", () => {
	it("rejects direct source package publishing by default", () => {
		expect(shouldAllowDirectPublish({})).toBe(false);
		expect(shouldAllowDirectPublish({ CLINE_ALLOW_DIRECT_PUBLISH: "1" })).toBe(
			true,
		);
		expect(DIRECT_PUBLISH_GUARD_MESSAGE).toContain(
			"Direct packaging or publishing from apps/cli is disabled.",
		);
	});

	it("rejects direct source package packing by default", () => {
		const cliRoot = fileURLToPath(new URL("../..", import.meta.url));

		const result = spawnSync(
			process.platform === "win32" ? "cmd.exe" : "bun",
			process.platform === "win32"
				? ["/d", "/s", "/c", "bun.cmd pm pack --dry-run"]
				: ["pm", "pack", "--dry-run"],
			{
				cwd: cliRoot,
				encoding: "utf8",
			},
		);

		expect(result.error).toBeUndefined();
		expect(result.status).not.toBe(0);
		expect(result.stderr + result.stdout).toContain(
			DIRECT_PUBLISH_GUARD_MESSAGE,
		);
	});

	it("packs the generated npm wrapper package", async () => {
		const packageDir = await mkdtemp(join(tmpdir(), "shri-cli-pack-"));
		try {
			await mkdir(join(packageDir, "bin"), { recursive: true });
			await writeFile(
				join(packageDir, "package.json"),
				`${JSON.stringify(
					{
						name: "@shrinivas-sn/shri",
						version: "1.2.3",
						description: "CLI test package",
						license: "Apache-2.0",
						bin: {
							shri: "./bin/shri",
						},
						optionalDependencies: {
							"@shrinivas-sn/shri-windows-x64": "1.2.3",
						},
					},
					null,
					2,
				)}\n`,
			);
			await writeFile(
				join(packageDir, "bin", "shri"),
				[
					"#!/usr/bin/env node",
					'console.log("shri wrapper smoke test");',
					"",
				].join("\n"),
			);
			await chmod(join(packageDir, "bin", "shri"), 0o755);

			const result = spawnSync(
				process.platform === "win32" ? "cmd.exe" : "npm",
				process.platform === "win32"
					? ["/d", "/s", "/c", "npm.cmd pack --offline --ignore-scripts --json"]
					: ["pack", "--offline", "--ignore-scripts", "--json"],
				{ cwd: packageDir, encoding: "utf8" },
			);

			expect(result.error).toBeUndefined();
			expect(result.status).toBe(0);
			const files = await readdir(packageDir);
			expect(files).toContain("shrinivas-sn-shri-1.2.3.tgz");
		} finally {
			if (
				resolve(dirname(packageDir)) === resolve(tmpdir()) &&
				basename(packageDir).startsWith("shri-cli-pack-")
			)
				await rm(packageDir, { recursive: true, force: true });
		}
	});
});
