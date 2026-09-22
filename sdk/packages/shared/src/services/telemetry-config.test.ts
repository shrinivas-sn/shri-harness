import { afterEach, describe, expect, it } from "vitest";
import { createClineTelemetryServiceConfig } from "./telemetry-config";

const OTEL_ENV_KEYS = [
	"OTEL_TELEMETRY_ENABLED",
	"OTEL_METRICS_EXPORTER",
	"OTEL_LOGS_EXPORTER",
	"OTEL_TRACES_EXPORTER",
	"OTEL_EXPORTER_OTLP_PROTOCOL",
	"OTEL_EXPORTER_OTLP_ENDPOINT",
	"OTEL_METRIC_EXPORT_INTERVAL",
	"OTEL_EXPORTER_OTLP_HEADERS",
] as const;

describe("createClineTelemetryServiceConfig", () => {
	const saved: Record<string, string | undefined> = {};

	afterEach(() => {
		for (const key of OTEL_ENV_KEYS) {
			if (saved[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = saved[key];
			}
		}
	});

	it("stays disabled with no OTEL_* environment configured (Shri preview default)", () => {
		for (const key of OTEL_ENV_KEYS) {
			saved[key] = process.env[key];
			delete process.env[key];
		}

		const config = createClineTelemetryServiceConfig();

		expect(config.enabled).toBe(false);
		expect(config.otlpEndpoint).toBeUndefined();
	});

	it("only enables when OTEL_TELEMETRY_ENABLED is explicitly set to 1 or true", () => {
		for (const key of OTEL_ENV_KEYS) {
			saved[key] = process.env[key];
			delete process.env[key];
		}
		process.env.OTEL_TELEMETRY_ENABLED = "0";
		expect(createClineTelemetryServiceConfig().enabled).toBe(false);

		process.env.OTEL_TELEMETRY_ENABLED = "1";
		expect(createClineTelemetryServiceConfig().enabled).toBe(true);
	});
});
