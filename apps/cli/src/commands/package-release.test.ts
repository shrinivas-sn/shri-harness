import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	buildPlatformPackageJson,
	buildWrapperPackageJson,
	findBuiltTargets,
	findWorkspaceDependencyLeaks,
	NODE_ENGINE_RANGE,
	RELEASE_TARGETS,
	RELEASE_VERSION,
	targetBinaryName,
	targetBootstrapSourcePath,
	targetBuildDirName,
	targetBuiltBinaryName,
	targetDisplayOs,
	targetPlatformPackageName,
	WRAPPER_PACKAGE_NAME,
} from "../../script/package-release";

describe("release version and identity", () => {
	it("matches PLAN.md's stated preview version and identity", () => {
		expect(RELEASE_VERSION).toBe("0.1.0-next.0");
		expect(WRAPPER_PACKAGE_NAME).toBe("@shrinivas-sn/shri");
		expect(NODE_ENGINE_RANGE).toBe(">=22.15.0");
	});
});

describe("target naming", () => {
	it("maps win32 to windows for display/package names, and windows/x64 to shri.exe", () => {
		const win = { os: "win32" as const, arch: "x64" as const };
		expect(targetDisplayOs(win)).toBe("windows");
		expect(targetPlatformPackageName(win)).toBe(
			"@shrinivas-sn/shri-windows-x64",
		);
		expect(targetBinaryName(win)).toBe("shri.exe");
		expect(targetBuildDirName(win)).toBe("cli-windows-x64");
		expect(targetBuiltBinaryName(win)).toBe("cline.exe");
	});

	it("keeps darwin/linux names as-is and uses the bare shri binary name", () => {
		const mac = { os: "darwin" as const, arch: "arm64" as const };
		expect(targetDisplayOs(mac)).toBe("darwin");
		expect(targetPlatformPackageName(mac)).toBe(
			"@shrinivas-sn/shri-darwin-arm64",
		);
		expect(targetBinaryName(mac)).toBe("shri");
		expect(targetBuiltBinaryName(mac)).toBe("cline");
	});

	it("covers exactly the six planned targets", () => {
		expect(RELEASE_TARGETS).toHaveLength(6);
		const names = RELEASE_TARGETS.map(targetPlatformPackageName).sort();
		expect(names).toEqual(
			[
				"@shrinivas-sn/shri-darwin-arm64",
				"@shrinivas-sn/shri-darwin-x64",
				"@shrinivas-sn/shri-linux-arm64",
				"@shrinivas-sn/shri-linux-x64",
				"@shrinivas-sn/shri-windows-arm64",
				"@shrinivas-sn/shri-windows-x64",
			].sort(),
		);
	});

	it("points targetBootstrapSourcePath at Task 2's extensions/ sibling of bin/", () => {
		const win = { os: "win32" as const, arch: "x64" as const };
		const path = targetBootstrapSourcePath("/dist", win);
		expect(path.replaceAll("\\", "/")).toBe(
			"/dist/cli-windows-x64/extensions/plugin-sandbox-bootstrap.js",
		);
	});
});

describe("buildPlatformPackageJson", () => {
	it("matches the wrapper manifest contract's platform package shape", () => {
		const pkg = buildPlatformPackageJson({
			target: { os: "win32", arch: "x64" },
			version: RELEASE_VERSION,
		});
		expect(pkg.name).toBe("@shrinivas-sn/shri-windows-x64");
		expect(pkg.version).toBe(RELEASE_VERSION);
		expect(pkg.os).toEqual(["win32"]);
		expect(pkg.cpu).toEqual(["x64"]);
		expect(pkg.bin).toEqual({ shri: "bin/shri.exe" });
		expect(pkg.license).toBe("Apache-2.0");
	});

	it("uses the bare shri binary (no .exe) for non-Windows targets", () => {
		const pkg = buildPlatformPackageJson({
			target: { os: "linux", arch: "x64" },
			version: RELEASE_VERSION,
		});
		expect(pkg.bin).toEqual({ shri: "bin/shri" });
	});
});

describe("buildWrapperPackageJson", () => {
	it("matches PLAN.md's exact wrapper manifest contract", () => {
		const pkg = buildWrapperPackageJson({
			version: RELEASE_VERSION,
			platformPackageNames: ["@shrinivas-sn/shri-windows-x64"],
		});
		expect(pkg.name).toBe("@shrinivas-sn/shri");
		expect(pkg.version).toBe(RELEASE_VERSION);
		expect(pkg.type).toBe("commonjs");
		expect(pkg.bin).toEqual({ shri: "bin/shri.cjs" });
		expect(pkg.engines).toEqual({ node: ">=22.15.0" });
		expect(pkg.files).toEqual(["bin"]);
		expect(pkg.license).toBe("Apache-2.0");
		expect(pkg.publishConfig).toEqual({ access: "public" });
	});

	it("adds exact-version optional dependencies for every generated platform package", () => {
		const pkg = buildWrapperPackageJson({
			version: RELEASE_VERSION,
			platformPackageNames: [
				"@shrinivas-sn/shri-windows-x64",
				"@shrinivas-sn/shri-linux-x64",
			],
		});
		expect(pkg.optionalDependencies).toEqual({
			"@shrinivas-sn/shri-linux-x64": RELEASE_VERSION,
			"@shrinivas-sn/shri-windows-x64": RELEASE_VERSION,
		});
	});

	it("never adds a dependencies field a workspace:* spec could hide in", () => {
		const pkg = buildWrapperPackageJson({
			version: RELEASE_VERSION,
			platformPackageNames: ["@shrinivas-sn/shri-windows-x64"],
		});
		expect(pkg).not.toHaveProperty("dependencies");
		expect(pkg).not.toHaveProperty("devDependencies");
	});
});

describe("findWorkspaceDependencyLeaks", () => {
	it("flags a workspace:* dependency", () => {
		expect(
			findWorkspaceDependencyLeaks({
				dependencies: { "@cline/core": "workspace:*" },
			}),
		).toEqual(["dependencies.@cline/core=workspace:*"]);
	});

	it("passes a clean manifest with only exact-version deps", () => {
		expect(
			findWorkspaceDependencyLeaks({
				optionalDependencies: {
					"@shrinivas-sn/shri-windows-x64": "0.1.0-next.0",
				},
			}),
		).toEqual([]);
	});
});

describe("findBuiltTargets", () => {
	let distDir: string;

	afterEach(() => {
		rmSync(distDir, { recursive: true, force: true });
	});

	it("reports found vs missing against the explicit target list, never scanning dist/ directly", () => {
		distDir = mkdtempSync(join(tmpdir(), "shri-package-release-dist-"));
		const winBinDir = join(distDir, "cli-windows-x64", "bin");
		mkdirSync(winBinDir, { recursive: true });
		writeFileSync(join(winBinDir, "cline.exe"), "fake binary");

		// A directory that isn't one of the known targets at all — proves this
		// isn't a directory scan: an unexpected dist/ entry must never leak
		// into a generated package.
		mkdirSync(join(distDir, "cli-totally-unknown-arch", "bin"), {
			recursive: true,
		});
		writeFileSync(
			join(distDir, "cli-totally-unknown-arch", "bin", "cline"),
			"x",
		);

		const { found, missing } = findBuiltTargets(distDir);

		expect(found).toHaveLength(1);
		expect(found[0]?.target).toEqual({ os: "win32", arch: "x64" });
		expect(missing).toHaveLength(5);
		expect(
			missing.map((m) => m.target.os + "-" + m.target.arch).sort(),
		).toEqual(
			[
				"darwin-arm64",
				"darwin-x64",
				"linux-arm64",
				"linux-x64",
				"win32-arm64",
			].sort(),
		);
	});

	it("reports every target missing when dist/ is empty", () => {
		distDir = mkdtempSync(join(tmpdir(), "shri-package-release-dist-"));

		const { found, missing } = findBuiltTargets(distDir);

		expect(found).toEqual([]);
		expect(missing).toHaveLength(6);
	});
});
