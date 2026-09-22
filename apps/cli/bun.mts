import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { $ } from "bun";
import {
	parseBuildOptions,
	shouldBuildHubWebview,
} from "./script/build-options";

function defineProcessEnv(name: string): string {
	return JSON.stringify(process.env[name] ?? "");
}

const sourcemap = Bun.env.CLINE_SOURCEMAPS === "1" ? "linked" : "none";
const rootDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(rootDir, "../../");
const hubWebviewDistPath = join(repoRoot, "apps/cline-hub/dist/webview");
const cliHubWebviewDistPath = join(rootDir, "dist/cline-hub/webview");

// The hub dashboard webview is not part of the Shri terminal preview: it is
// an explicit, opt-in development step (--with-hub-webview), never a silent
// default this build depends on. Its own workspace isn't wired up to
// install vite/@vitejs/plugin-react-swc/@tailwindcss/vite, so building it
// unconditionally here previously made every terminal build fail outright.
const buildOptions = parseBuildOptions(Bun.argv.slice(2));
if (shouldBuildHubWebview(buildOptions)) {
	console.log("Building Cline Hub webview...");
	await $`bun -F @cline/cline-hub build:webview`.cwd(repoRoot);
}

const result = await Bun.build({
	entrypoints: ["./src/index.ts"],
	outdir: "./dist",
	target: "node",
	format: "esm",
	sourcemap,
	packages: "bundle", // Keep private workspace packages bundled so npm consumers do not need @cline/* at runtime.
	external: [
		// OpenTUI resolves a platform-specific native package at runtime.
		// Bundling through that resolution path rewrites the import in a way that
		// breaks Linux e2e runs from dist/. Keep React external too so OpenTUI and
		// the CLI share one React runtime instead of ending up with duplicate hook
		// dispatchers in the bundle.
		"@opentui/core",
		"@opentui/react",
		"@opentui-ui/dialog",
		"opentui-spinner",
		"react",
		"react/jsx-runtime",
		"react/jsx-dev-runtime",
		"react-devtools-core",
		// Optional, dynamically-imported (`await import(...)`) provider SDK:
		// @jerome-benoit/sap-ai-provider only loads this if a user actually
		// configures the SAP AI provider. Bundling it eagerly would make every
		// build require it installed; it's legitimately absent here (a
		// pre-existing Windows package-linking failure for this one package,
		// unrelated to Shri/the Groq-focused preview) and that's fine — the
		// dynamic import only fails at runtime for someone who tries to use
		// the SAP provider without it installed, same as upstream's contract.
		"@sap-ai-sdk/foundation-models",
	],
	define: {
		"process.env.NODE_ENV": '"production"',
		...(process.env.TELEMETRY_SERVICE_API_KEY
			? {
					"process.env.TELEMETRY_SERVICE_API_KEY": defineProcessEnv(
						"TELEMETRY_SERVICE_API_KEY",
					),
				}
			: {}),
		...(process.env.ERROR_SERVICE_API_KEY
			? {
					"process.env.ERROR_SERVICE_API_KEY": defineProcessEnv(
						"ERROR_SERVICE_API_KEY",
					),
				}
			: {}),
		"process.env.OTEL_TELEMETRY_ENABLED": defineProcessEnv(
			"OTEL_TELEMETRY_ENABLED",
		),
		"process.env.OTEL_EXPORTER_OTLP_ENDPOINT": defineProcessEnv(
			"OTEL_EXPORTER_OTLP_ENDPOINT",
		),
		"process.env.OTEL_METRICS_EXPORTER": defineProcessEnv(
			"OTEL_METRICS_EXPORTER",
		),
		"process.env.OTEL_LOGS_EXPORTER": defineProcessEnv("OTEL_LOGS_EXPORTER"),
		"process.env.OTEL_TRACES_EXPORTER": defineProcessEnv(
			"OTEL_TRACES_EXPORTER",
		),
		"process.env.CLINE_TRACE_RECORD_CONTENT": defineProcessEnv(
			"CLINE_TRACE_RECORD_CONTENT",
		),
		"process.env.OTEL_EXPORTER_OTLP_PROTOCOL": defineProcessEnv(
			"OTEL_EXPORTER_OTLP_PROTOCOL",
		),
		"process.env.OTEL_METRIC_EXPORT_INTERVAL": defineProcessEnv(
			"OTEL_METRIC_EXPORT_INTERVAL",
		),
		"process.env.OTEL_EXPORTER_OTLP_HEADERS": defineProcessEnv(
			"OTEL_EXPORTER_OTLP_HEADERS",
		),
	},
	env: "OTEL_*",
	banner:
		'import { createRequire as __clineCreateRequire } from "node:module"; const require = __clineCreateRequire(import.meta.url);',
});

if (result.logs.length > 0) {
	for (const log of result.logs) {
		console.warn(log);
	}
}

const coreBootstrapPath = join(
	rootDir,
	"../../sdk/packages/core/dist/extensions/plugin-sandbox-bootstrap.js",
);
const cliBootstrapPath = join(
	rootDir,
	"./dist/extensions/plugin-sandbox-bootstrap.js",
);
mkdirSync(dirname(cliBootstrapPath), { recursive: true });
copyFileSync(coreBootstrapPath, cliBootstrapPath);

if (existsSync(hubWebviewDistPath)) {
	mkdirSync(dirname(cliHubWebviewDistPath), { recursive: true });
	cpSync(hubWebviewDistPath, cliHubWebviewDistPath, { recursive: true });
}
