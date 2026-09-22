#!/usr/bin/env bun

export const DIRECT_PUBLISH_GUARD_MESSAGE = [
	"Direct packaging or publishing from apps/cli is disabled.",
	"The source package points its development bin at src/index.ts, while the public Shri packages are generated under dist/npm/.",
	"Run `bun run build:platforms` (or build:platforms:single) first, then `bun run package:release` to generate",
	"dist/npm/shri/ (the @shrinivas-sn/shri wrapper) and dist/npm/shri-<os>-<arch>/ (the platform packages) locally.",
	"Publication is a separate, explicit step (PLAN.md Task 7) requiring its own authorization — this guard never bypasses that.",
].join("\n");

export function shouldAllowDirectPublish(env: NodeJS.ProcessEnv): boolean {
	return env.CLINE_ALLOW_DIRECT_PUBLISH === "1";
}

if (import.meta.main && !shouldAllowDirectPublish(process.env)) {
	console.error(DIRECT_PUBLISH_GUARD_MESSAGE);
	process.exit(1);
}
