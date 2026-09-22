import { type BasicLogger, normalizeSdkError } from "@cline/core";
import { createCliLoggerAdapter, flushCliLoggerAdapters } from "./adapter";

export function logCliError(
	logger: BasicLogger | undefined,
	message: string,
	metadata: Record<string, unknown> & { error?: unknown } = {},
): void {
	if (logger?.error) {
		logger.error(message, metadata);
		return;
	}
	logger?.log(message, {
		...metadata,
		severity: "error",
	});
}

export function logCliProcessError(kind: string, error: unknown): void {
	try {
		const logger = createCliLoggerAdapter({
			runtime: "cli",
			component: "process",
		});
		// Log a sanitized/normalized representation, not the raw error object:
		// a provider SDK's thrown error can embed request details (including
		// credentials) that would otherwise land unredacted in a persisted log
		// file. See sanitizeTelemetryErrorMessage's doc comment for the same
		// concern on the stderr path in index.ts.
		logCliError(logger.core, "CLI process error", {
			kind,
			error: normalizeSdkError(error),
		});
		flushCliLoggerAdapters();
	} catch {
		// Process-level logging is best-effort; stderr still gets the error.
	}
}
