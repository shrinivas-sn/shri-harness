import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const WRAPPER_NAME = "@shrinivas-sn/shri";

function fail(message) {
	throw new Error(`Publish input check failed: ${message}`);
}

function checkedTarballPath(root, tarball) {
	if (
		typeof tarball !== "string" ||
		!/^tarballs\/[a-z0-9][a-z0-9.-]*\.tgz$/.test(tarball) ||
		isAbsolute(tarball)
	) {
		fail("unsafe tarball path");
	}
	const path = resolve(root, ...tarball.split("/"));
	const rel = relative(resolve(root), path);
	if (!rel || rel === ".." || rel.startsWith(`..${sep}`)) {
		fail("unsafe tarball path");
	}
	return path;
}

export function validatePublishInputs(report, artifactRoot, version, targets) {
	if (!/^\d+\.\d+\.\d+-next\.\d+$/.test(version)) {
		fail("version must be a next prerelease");
	}
	if (
		!Array.isArray(targets) ||
		targets.length === 0 ||
		new Set(targets).size !== targets.length ||
		targets.some((target) => !/^[a-z]+-[a-z0-9]+$/.test(target))
	) {
		fail("invalid release targets");
	}
	if (
		report?.schemaVersion !== 1 ||
		report.patchProvenance?.pass !== true ||
		!Array.isArray(report.packages)
	) {
		fail("invalid verification report");
	}
	const expected = [
		...targets.map((target) => ({
			name: `${WRAPPER_NAME}-${target}`,
			target,
		})),
		{ name: WRAPPER_NAME, target: "wrapper" },
	];
	if (
		report.packages.length !== expected.length ||
		new Set(report.packages.map((item) => item?.target)).size !==
			expected.length
	) {
		fail("unexpected packages or targets");
	}
	return expected.map(({ name, target }) => {
		const entry = report.packages.find((item) => item?.target === target);
		if (
			entry?.package !== name ||
			entry.version !== version ||
			!Array.isArray(entry.checks) ||
			entry.checks.length === 0 ||
			entry.checks.some((check) => check?.pass !== true)
		) {
			fail(`invalid package metadata or checks for ${target}`);
		}
		if (!entry.checks.some((check) => check.id === "repository")) {
			fail(`missing repository check for ${target}`);
		}
		const tarballPath = checkedTarballPath(artifactRoot, entry.tarball);
		const expectedFilename = `${name.slice(1).replaceAll("/", "-")}-${version}.tgz`;
		if (basename(tarballPath) !== expectedFilename) {
			fail(`unexpected tarball path for ${target}`);
		}
		let stats;
		try {
			stats = lstatSync(tarballPath);
		} catch {
			fail(`missing tarball for ${target}`);
		}
		if (!stats.isFile() || stats.size !== entry.size) {
			fail(`tarball size mismatch for ${target}`);
		}
		const sha256 = createHash("sha256")
			.update(readFileSync(tarballPath))
			.digest("hex");
		if (sha256 !== entry.sha256) {
			fail(`tarball sha256 mismatch for ${target}`);
		}
		return { name, version, target, path: tarballPath, sha256 };
	});
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			report: { type: "string" },
			version: { type: "string" },
			target: { type: "string", multiple: true },
		},
		strict: true,
	});
	if (!values.report || !values.version || !values.target?.length) {
		fail("use --report <path> --version <version> --target <target>");
	}
	const packages = validatePublishInputs(
		JSON.parse(readFileSync(values.report, "utf8")),
		resolve(values.report, ".."),
		values.version,
		values.target,
	);
	process.stdout.write(`${JSON.stringify(packages)}\n`);
}
