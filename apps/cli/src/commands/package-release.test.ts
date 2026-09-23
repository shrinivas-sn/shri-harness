import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
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
	writeFileSync(join(root, "NOTICE"), "Cline attribution fixture\n");
	writeFileSync(join(root, "ca-certs.cjs"), "fixture CA helper");
	return root;
}

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true });
	}
});

describe("package:release", () => {
	it("wires a local-only generator in the CLI scripts", () => {
		const pkg = JSON.parse(
			readFileSync(
				join(import.meta.dirname, "..", "..", "package.json"),
				"utf8",
			),
		);
		expect(pkg.scripts["package:release"]).toBe(
			"bun script/package-release.ts",
		);
		expect(pkg.repository.url).toBe(
			"git+https://github.com/shrinivas-sn/shri-harness.git",
		);
		expect(pkg.scripts["publish:npm"]).toBeUndefined();
	});
	it("generates scoped wrapper and platform packages without lifecycle scripts", () => {
		const root = createFixtureRoot();
		const outputDir = join(root, "artifacts", "npm");

		createReleasePackages({
			artifactsDir: join(root, "artifacts"),
			outputDir,
			version: "0.1.0-next.0",
			readmePath: join(root, "README.md"),
			licensePath: join(root, "LICENSE"),
			wrapperPath: join(root, "shri.cjs"),
			wrapperContents: "module.exports = {};\n",
			caCertsPath: join(root, "ca-certs.cjs"),
			noticePath: join(root, "NOTICE"),
		});

		const wrapper = JSON.parse(
			readFileSync(join(outputDir, "shri", "package.json"), "utf8"),
		) as Record<string, unknown>;
		expect(wrapper).toMatchObject({
			name: "@shrinivas-sn/shri",
			version: "0.1.0-next.0",
			repository: {
				type: "git",
				url: "git+https://github.com/shrinivas-sn/shri-harness.git",
			},
			type: "commonjs",
			bin: { shri: "bin/shri.cjs" },
			engines: { node: ">=22.15.0" },
			files: ["bin", "NOTICE"],
			publishConfig: { access: "public" },
		});
		expect(wrapper).not.toHaveProperty("scripts");
		expect(wrapper).not.toHaveProperty("dependencies");
		expect(wrapper).toHaveProperty(
			"optionalDependencies.@shrinivas-sn/shri-windows-x64",
			"0.1.0-next.0",
		);
		expect(Object.keys(wrapper.optionalDependencies as object).sort()).toEqual([
			"@shrinivas-sn/shri-darwin-arm64",
			"@shrinivas-sn/shri-linux-x64",
			"@shrinivas-sn/shri-windows-x64",
		]);
		expect(
			readFileSync(join(outputDir, "shri", "bin", "ca-certs.cjs"), "utf8"),
		).toBe("fixture CA helper");
		expect(readFileSync(join(outputDir, "shri", "NOTICE"), "utf8")).toBe(
			"Cline attribution fixture\n",
		);
		expect(
			readFileSync(join(outputDir, "shri-windows-x64", "NOTICE"), "utf8"),
		).toBe("Cline attribution fixture\n");

		const windows = JSON.parse(
			readFileSync(join(outputDir, "shri-windows-x64", "package.json"), "utf8"),
		) as Record<string, unknown>;
		expect(windows).toMatchObject({
			name: "@shrinivas-sn/shri-windows-x64",
			version: "0.1.0-next.0",
			repository: {
				type: "git",
				url: "git+https://github.com/shrinivas-sn/shri-harness.git",
			},
			os: ["win32"],
			cpu: ["x64"],
			bin: { shri: "bin/shri.exe" },
			files: ["bin", "extensions", "NOTICE"],
		});
	});

	it.skipIf(process.platform === "win32")(
		"marks the generated Node launcher executable on POSIX",
		() => {
			const root = createFixtureRoot();
			const outputDir = join(root, "artifacts", "npm");
			createReleasePackages({
				artifactsDir: join(root, "artifacts"),
				outputDir,
				version: "0.1.0-next.0",
				readmePath: join(root, "README.md"),
				licensePath: join(root, "LICENSE"),
				noticePath: join(root, "NOTICE"),
				wrapperPath: join(root, "shri.cjs"),
				wrapperContents: "module.exports = {};\n",
				caCertsPath: join(root, "ca-certs.cjs"),
				targetIds: ["linux-x64"],
			});
			expect(
				statSync(join(outputDir, "shri", "bin", "shri.cjs")).mode & 0o111,
			).not.toBe(0);
		},
	);

	it("rejects a missing explicit target instead of enumerating stale artifacts", () => {
		const root = createFixtureRoot();
		rmSync(join(root, "artifacts", "cli-linux-x64"), {
			recursive: true,
			force: true,
		});

		expect(() =>
			createReleasePackages({
				artifactsDir: join(root, "artifacts"),
				outputDir: join(root, "artifacts", "npm"),
				version: "0.1.0-next.0",
				readmePath: join(root, "README.md"),
				licensePath: join(root, "LICENSE"),
				wrapperPath: join(root, "shri.cjs"),
				wrapperContents: "module.exports = {};\n",
				caCertsPath: join(root, "ca-certs.cjs"),
				noticePath: join(root, "NOTICE"),
			}),
		).toThrow("Missing platform artifact: cli-linux-x64");
	});

	it("can generate only an explicitly requested host target", () => {
		const root = createFixtureRoot();
		const outputDir = join(root, "artifacts", "npm");
		createReleasePackages({
			artifactsDir: join(root, "artifacts"),
			outputDir,
			version: "0.1.0-next.0",
			readmePath: join(root, "README.md"),
			licensePath: join(root, "LICENSE"),
			wrapperPath: join(root, "shri.cjs"),
			wrapperContents: "module.exports = {};\n",
			caCertsPath: join(root, "ca-certs.cjs"),
			noticePath: join(root, "NOTICE"),
			targetIds: ["windows-x64"],
		});
		const wrapper = JSON.parse(
			readFileSync(join(outputDir, "shri", "package.json"), "utf8"),
		);
		expect(wrapper.optionalDependencies).toEqual({
			"@shrinivas-sn/shri-windows-x64": "0.1.0-next.0",
		});
		expect(() =>
			readFileSync(join(outputDir, "shri-linux-x64", "package.json")),
		).toThrow();
	});

	it("preserves a previous local package when a required artifact is missing", () => {
		const root = createFixtureRoot();
		const outputDir = join(root, "artifacts", "npm");
		mkdirSync(outputDir);
		writeFileSync(join(outputDir, "sentinel"), "existing package");
		rmSync(
			join(
				root,
				"artifacts",
				"cli-windows-x64",
				"extensions",
				"plugin-sandbox-bootstrap.js",
			),
		);
		expect(() =>
			createReleasePackages({
				artifactsDir: join(root, "artifacts"),
				outputDir,
				version: "0.1.0-next.0",
				readmePath: join(root, "README.md"),
				licensePath: join(root, "LICENSE"),
				noticePath: join(root, "NOTICE"),
				wrapperPath: join(root, "shri.cjs"),
				wrapperContents: "module.exports = {};\n",
				caCertsPath: join(root, "ca-certs.cjs"),
				targetIds: ["windows-x64"],
			}),
		).toThrow("Missing required release file");
		expect(readFileSync(join(outputDir, "sentinel"), "utf8")).toBe(
			"existing package",
		);
	});
});
