import { describe, expect, it, vi } from "vitest";

const loggerCore = {
	error: vi.fn(),
	log: vi.fn(),
};

vi.mock("./adapter", () => ({
	createCliLoggerAdapter: vi.fn(() => ({ core: loggerCore })),
	flushCliLoggerAdapters: vi.fn(),
}));

import { logCliProcessError } from "./errors";

describe("logCliProcessError", () => {
	it("never writes a raw Authorization/Bearer credential to the log", () => {
		loggerCore.error.mockClear();
		const secret = "gsk_SHRI_TEST_SECRET_DO_NOT_LOG_1234567890";
		const error = new Error(
			`request failed: Authorization=Bearer ${secret} at https://api.groq.com/openai/v1/chat/completions`,
		);

		logCliProcessError("runCli", error);

		expect(loggerCore.error).toHaveBeenCalledTimes(1);
		const loggedPayload = JSON.stringify(loggerCore.error.mock.calls[0]);
		expect(loggedPayload).not.toContain(secret);
		expect(loggedPayload).toContain("[redacted]");
	});
});
