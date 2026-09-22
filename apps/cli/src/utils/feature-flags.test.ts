import { afterEach, describe, expect, it, vi } from "vitest";
import {
	disposeCliFeatureFlagsService,
	getCliFeatureFlagsService,
} from "./feature-flags";

describe("CLI feature flags singleton", () => {
	afterEach(async () => {
		await disposeCliFeatureFlagsService();
	});

	it("recreates the singleton after disposal", async () => {
		const service = getCliFeatureFlagsService();

		await disposeCliFeatureFlagsService();

		expect(getCliFeatureFlagsService()).not.toBe(service);
	});
});

describe("CLI feature flags telemetry opt-in", () => {
	const originalApiKey = process.env.TELEMETRY_SERVICE_API_KEY;

	afterEach(async () => {
		await disposeCliFeatureFlagsService();
		if (originalApiKey === undefined) {
			delete process.env.TELEMETRY_SERVICE_API_KEY;
		} else {
			process.env.TELEMETRY_SERVICE_API_KEY = originalApiKey;
		}
	});

	it("never reaches PostHog with no TELEMETRY_SERVICE_API_KEY (Shri preview default)", async () => {
		delete process.env.TELEMETRY_SERVICE_API_KEY;
		const fetchSpy = vi
			.spyOn(globalThis, "fetch")
			.mockRejectedValue(new Error("should not fetch"));

		const service = getCliFeatureFlagsService();
		await service.poll().catch(() => {});

		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
