import {
	chmodSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	createReleasePackages,
	RELEASE_TARGETS,
} from "../../script/package-release";

const tempDirs: string[] = [];

function createFixtureRoot(): string {
	const root = mkdtempSync(join(tmpdir(), "shri-package-release-"));
	tempDirs.push(root);
	for (const target of RELEASE_TARGETS) {
		const packageDir = join(root, "artifacts", target.artifactDirectory);
		mkdirSync(join(packageDir, "bin"), { recursive: true });
		mkdirSync(join(packageDir, "extensions"), { recursive: true });
		writeFileSync(
			join(packageDir, "bin", target.binaryName),
			"fixture executable",
		);
		chmodSync(join(packageDir, "bin", target.binaryName), 0o755);
		writeFileSync(
			join(packageDir, "extensions", "plugin-sandbox-bootstrap.js"),
			"fixture bootstrap",
		);
	}
	writeFileSync(join(root, "README.md"), "# Shri\n");
	writeFileSync(join(root, "LICENSE"), "Apache-2.0\n");
	return root;
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe("package:release", () => {
	it("generates scoped wrapper and platform packages without lifecycle scripts", () => {
		const root = createFixtureRoot();
		const outputDir = join(root, "npm");

		createReleasePackages({
			artifactsDir: join(root, "artifacts"),
			outputDir,
			version: "0.1.0-next.0",
			readmePath: join(root, "README.md"),
			licensePath: join(root, "LICENSE"),
			wrapperPath: join(root, "shri.cjs"),
			wrapperContents: "module.exports = {};\n",
		});

		const wrapper = JSON.parse(
			readFileSync(join(outputDir, "shri", "package.json"), "utf8"),
		) as Record<string, unknown>;
		expect(wrapper).toMatchObject({
			name: "@shrinivas-sn/shri",
			version: "0.1.0-next.0",
			type: "commonjs",
			bin: { shri: "bin/shri.cjs" },
			engines: { node: ">=22.15.0" },
			files: ["bin"],
			publishConfig: { access: "public" },
		});
		expect(wrapper).not.toHaveProperty("scripts");
		expect(wrapper).not.toHaveProperty("dependencies");
		expect(wrapper).toHaveProperty(
		"optionalDependencies.@shrinivas-sn/shri-windows-x64",
		"0.1.0-next.0",
	);

		const windows = JSON.parse(
			readFileSync(join(outputDir, "shri-windows-x64", "package.json"), "utf8"),
		) as Record<string, unknown>;
		expect(windows).toMatchObject({
			name: "@shrinivas-sn/shri-windows-x64",
			version: "0.1.0-next.0",
			os: ["win32"],
			cpu: ["x64"],
			bin: { shri: "bin/shri.exe" },
		});
	});

	it("rejects a missing explicit target instead of enumerating stale artifacts", () => {
		const root = createFixtureRoot();
		rmSync(join(root, "artifacts", "cli-linux-arm64"), {
			recursive: true,
			force: true,
		});

		expect(() =>
			createReleasePackages({
				artifactsDir: join(root, "artifacts"),
				outputDir: join(root, "npm"),
				version: "0.1.0-next.0",
				readmePath: join(root, "README.md"),
				licensePath: join(root, "LICENSE"),
				wrapperPath: join(root, "shri.cjs"),
				wrapperContents: "module.exports = {};\n",
			}),
		).toThrow("Missing platform artifact: cli-linux-arm64");
	});
});
