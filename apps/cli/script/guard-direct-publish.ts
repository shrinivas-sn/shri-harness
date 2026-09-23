#!/usr/bin/env bun

export const DIRECT_PUBLISH_GUARD_MESSAGE = [
	"Direct packaging or publishing from apps/cli is disabled.",
	"The source package points its development bin at src/index.ts; Shri packages are generated under dist/npm.",
	"Run `bun run build:platforms:single`, then `bun run package:release --target windows-x64` for local artifacts.",
	"Publication remains disabled until the release verification gates are complete.",
].join("\n");

export function shouldAllowDirectPublish(env: NodeJS.ProcessEnv): boolean {
	return env.CLINE_ALLOW_DIRECT_PUBLISH === "1";
}

if (import.meta.main && !shouldAllowDirectPublish(process.env)) {
	console.error(DIRECT_PUBLISH_GUARD_MESSAGE);
	process.exit(1);
}
