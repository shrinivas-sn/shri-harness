import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve, sep } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validatePublishInputs } from "../../script/check-publish-inputs.mjs";

const temporaryRoots: string[] = [];
const version = "0.1.0-next.0";

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "shri-publish-"));
	temporaryRoots.push(root);
	const tarballDir = join(root, "tarballs");
	mkdirSync(tarballDir);
	const packages = [
		{ package: "@shrinivas-sn/shri", target: "wrapper" },
		{ package: "@shrinivas-sn/shri-windows-x64", target: "windows-x64" },
	].map((item) => {
		const name = `${item.package.slice(1).replaceAll("/", "-")}-${version}.tgz`;
		const bytes = Buffer.from(`fixture-${item.target}`);
		writeFileSync(join(tarballDir, name), bytes);
		return {
			...item,
			version,
			tarball: `tarballs/${name}`,
			size: bytes.length,
			sha256: createHash("sha256").update(bytes).digest("hex"),
			checks: [
				{ id: "manifest", pass: true },
				{ id: "repository", pass: true },
			],
		};
	});
	const report = {
		schemaVersion: 1,
		patchProvenance: { pass: true },
		packages,
	};
	return { root, report };
}

afterEach(() => {
	for (const root of temporaryRoots.splice(0)) {
		const expectedParent = resolve(tmpdir());
		const rel = relative(expectedParent, resolve(root));
		if (
			!rel ||
			rel === ".." ||
			rel.startsWith(`..${sep}`) ||
			!basename(root).startsWith("shri-publish-")
		) {
			throw new Error("Unsafe publish-test cleanup target");
		}
		rmSync(root, { recursive: true, force: true });
	}
});

describe("publish input gate", () => {
	it("orders the exact verified Windows package before its wrapper", () => {
		const { root, report } = fixture();
		const packages = validatePublishInputs(report, root, version, [
			"windows-x64",
		]);
		expect(packages.map((item: { name: string }) => item.name)).toEqual([
			"@shrinivas-sn/shri-windows-x64",
			"@shrinivas-sn/shri",
		]);
	});

	it("rejects an advertised target that was not approved for this release", () => {
		const { root, report } = fixture();
		report.packages.push({
			...report.packages[1]!,
			package: "@shrinivas-sn/shri-linux-x64",
			target: "linux-x64",
		});
		expect(() =>
			validatePublishInputs(report, root, version, ["windows-x64"]),
		).toThrow(/targets|packages/i);
	});

	it("rejects a changed tarball after artifact verification", () => {
		const { root, report } = fixture();
		writeFileSync(join(root, report.packages[1]!.tarball), "tampered");
		expect(() =>
			validatePublishInputs(report, root, version, ["windows-x64"]),
		).toThrow(/sha256|size/i);
	});

	it("rejects tarball paths outside the downloaded artifact", () => {
		const { root, report } = fixture();
		report.packages[1]!.tarball = "../outside.tgz";
		expect(() =>
			validatePublishInputs(report, root, version, ["windows-x64"]),
		).toThrow(/tarball path/i);
	});

	it("rejects a failed verifier check", () => {
		const { root, report } = fixture();
		report.packages[1]!.checks[0]!.pass = false;
		expect(() =>
			validatePublishInputs(report, root, version, ["windows-x64"]),
		).toThrow(/checks/i);
	});

	it("rejects an old report without the public-repository check", () => {
		const { root, report } = fixture();
		report.packages[1]!.checks.pop();
		expect(() =>
			validatePublishInputs(report, root, version, ["windows-x64"]),
		).toThrow(/repository/i);
	});
});
