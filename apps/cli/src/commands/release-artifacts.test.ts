import { describe, expect, it } from "vitest";
import {
	inspectReleaseFiles,
	parseTarballEntries,
	RELEASE_CANARY,
} from "../../script/verify-release";

const version = "0.1.0-next.0";
const executable = Buffer.from(
	"MZ parser.worker.js OTUI_TREE_SITTER_WORKER_PATH OPENTUI_LIBC @opentui/core",
);

function platformFiles(): Map<string, Buffer> {
	return new Map([
		[
			"package/package.json",
			Buffer.from(
				JSON.stringify({
					name: "@shrinivas-sn/shri-windows-x64",
					version,
					repository: {
						type: "git",
						url: "git+https://github.com/shrinivas-sn/shri-harness.git",
					},
					bin: { shri: "bin/shri.exe" },
					license: "Apache-2.0",
					os: ["win32"],
					cpu: ["x64"],
				}),
			),
		],
		["package/bin/shri.exe", executable],
		[
			"package/extensions/plugin-sandbox-bootstrap.js",
			Buffer.from("bootstrap"),
		],
		["package/README.md", Buffer.from("readme")],
		["package/LICENSE", Buffer.from("Apache License")],
		["package/NOTICE", Buffer.from("notices")],
	]);
}

function checkIds(files: Map<string, Buffer>): string[] {
	return inspectReleaseFiles(files, "windows-x64", version)
		.filter((x) => !x.pass)
		.map((x) => x.id);
}

describe("release tarball inspection", () => {
	it("accepts the expected platform inventory", () => {
		expect(checkIds(platformFiles())).toEqual([]);
	});

	it.each([
		["bin/shri.exe", "executable"],
		["extensions/plugin-sandbox-bootstrap.js", "bootstrap"],
		["README.md", "attribution"],
		["NOTICE", "attribution"],
	])("rejects missing %s by %s check", (path, id) => {
		const files = platformFiles();
		files.delete(`package/${path}`);
		expect(checkIds(files)).toContain(id);
	});

	it.each([
		["parser.worker.js", "worker"],
		["OPENTUI_LIBC", "native"],
	])("rejects missing embedded %s", (marker, id) => {
		const files = platformFiles();
		files.set(
			"package/bin/shri.exe",
			Buffer.from(executable.toString().replace(marker, "")),
		);
		expect(checkIds(files)).toContain(id);
	});

	it("rejects version skew and workspace dependencies", () => {
		const files = platformFiles();
		const manifest = JSON.parse(files.get("package/package.json")!.toString());
		manifest.version = "0.2.0";
		manifest.dependencies = { foo: "workspace:*" };
		files.set("package/package.json", Buffer.from(JSON.stringify(manifest)));
		expect(checkIds(files)).toEqual(
			expect.arrayContaining(["version", "dependencies"]),
		);
	});

	it("rejects release metadata pointing at a different public repository", () => {
		const files = platformFiles();
		const manifest = JSON.parse(files.get("package/package.json")!.toString());
		manifest.repository.url = "git+https://github.com/cline/cline.git";
		files.set("package/package.json", Buffer.from(JSON.stringify(manifest)));
		expect(checkIds(files)).toContain("repository");
	});

	it.each([
		".npmrc",
		".env",
		"settings.json",
		"sessions/chat.json",
		"fixtures/sample.vcr",
		"node_modules/foo.js",
	])("rejects forbidden path %s", (path) => {
		const files = platformFiles();
		files.set(`package/${path}`, Buffer.from("x"));
		expect(checkIds(files)).toContain("paths");
	});

	it.each([
		"text",
		"binary",
	])("rejects synthetic credential in %s without echoing it", (kind) => {
		const files = platformFiles();
		const path = kind === "text" ? "package/README.md" : "package/bin/shri.exe";
		files.set(
			path,
			Buffer.concat([files.get(path)!, Buffer.from(RELEASE_CANARY)]),
		);
		const checks = inspectReleaseFiles(files, "windows-x64", version);
		expect(checks.find((x) => x.id === "credentials")?.pass).toBe(false);
		expect(JSON.stringify(checks)).not.toContain(RELEASE_CANARY);
	});

	it.each([
		"package/../outside",
		"package/README.md:stream",
		"package/CON",
		"outside/file",
	])("rejects unsafe tar path %s before extraction", (path) => {
		const header = Buffer.alloc(1024);
		header.write(path, 0);
		header.write("00000000000\0", 124);
		header.write("00000000000\0", 136);
		header.write("        ", 148);
		header.write("0", 156);
		header.write("ustar\0", 257);
		const sum = header.subarray(0, 512).reduce((a, b) => a + b, 0);
		header.write(sum.toString(8).padStart(6, "0") + "\0 ", 148);
		expect(() => parseTarballEntries(header)).toThrow(/unsafe tar path/i);
	});
});
