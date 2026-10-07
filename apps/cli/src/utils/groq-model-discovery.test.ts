import { describe, expect, it, vi } from "vitest";
import {
	type DiscoveryFetch,
	discoverGroqModels,
	type GroqDiscoveryResult,
	reconcileGroqModels,
} from "./groq-model-discovery";

const SECRET_KEY = "gsk-effective-secret-key";
const SECRET_BODY = "secret-body-marker";

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function fetchReturning(response: Response | (() => Response)) {
	return vi.fn<DiscoveryFetch>(async () =>
		typeof response === "function" ? response() : response,
	);
}

/** Never settles on its own; rejects with the abort reason like real fetch. */
function hangingFetch() {
	return vi.fn<DiscoveryFetch>(
		(_url, init) =>
			new Promise<Response>((_resolve, reject) => {
				init.signal?.addEventListener("abort", () =>
					reject(init.signal?.reason),
				);
			}),
	);
}

function expectError(
	result: GroqDiscoveryResult,
	kind: string,
): asserts result is Extract<GroqDiscoveryResult, { status: "error" }> {
	expect(result).toMatchObject({ status: "error", kind });
	if (result.status !== "error") throw new Error("expected error");
	expect(result.message).not.toContain(SECRET_KEY);
	expect(result.message).not.toContain(SECRET_BODY);
	expect(result.message).not.toContain("user:pw");
}

describe("discoverGroqModels", () => {
	it("requests only the effective endpoint and key it was given", async () => {
		const fetch = fetchReturning(jsonResponse({ data: [{ id: "a" }] }));

		const result = await discoverGroqModels({
			baseUrl: " https://custom.example/openai/v1/ ",
			apiKey: ` ${SECRET_KEY} `,
			headers: { "X-Org": "org-1" },
			fetch,
		});

		expect(result).toEqual({ status: "ok", ids: ["a"] });
		expect(fetch).toHaveBeenCalledTimes(1);
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe("https://custom.example/openai/v1/models");
		expect(init.method).toBe("GET");
		expect(init.redirect).toBe("manual");
		expect(init.headers).toEqual({
			"X-Org": "org-1",
			Authorization: `Bearer ${SECRET_KEY}`,
		});
	});

	it("preserves an explicit Authorization header case-insensitively", async () => {
		const fetch = fetchReturning(jsonResponse({ data: [] }));

		await discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			headers: { authorization: "Bearer from-headers" },
			fetch,
		});

		expect(fetch.mock.calls[0][1].headers).toEqual({
			authorization: "Bearer from-headers",
		});
	});

	it("does not mutate the caller's headers", async () => {
		const headers = { "X-Org": "org-1" };
		await discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			headers,
			fetch: fetchReturning(jsonResponse({ data: [] })),
		});

		expect(headers).toEqual({ "X-Org": "org-1" });
	});

	it("returns trimmed IDs deduplicated in endpoint order", async () => {
		const result = await discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			fetch: fetchReturning(
				jsonResponse({
					object: "list",
					data: [
						{ id: "openai/gpt-oss-120b", object: "model" },
						{ id: " llama-3.1-8b-instant " },
						{ id: "openai/gpt-oss-120b" },
					],
				}),
			),
		});

		expect(result).toEqual({
			status: "ok",
			ids: ["openai/gpt-oss-120b", "llama-3.1-8b-instant"],
		});
	});

	it("treats an empty model list as success, not failure", async () => {
		const result = await discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			fetch: fetchReturning(jsonResponse({ data: [] })),
		});

		expect(result).toEqual({ status: "ok", ids: [] });
	});

	it.each([
		["missing data", { models: [] }],
		["non-array data", { data: { id: "a" } }],
		["entry without id", { data: [{ id: "a" }, { name: "b" }] }],
		["blank id", { data: [{ id: "a" }, { id: "  " }] }],
		["non-string id", { data: [{ id: 7 }] }],
		["null entry", { data: [null] }],
		["array payload", [{ id: "a" }]],
	])("rejects a malformed response (%s)", async (_label, body) => {
		const result = await discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			fetch: fetchReturning(jsonResponse(body)),
		});

		expectError(result, "response");
	});

	it("rejects a non-JSON body without echoing it", async () => {
		const result = await discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			fetch: fetchReturning(new Response(`<html>${SECRET_BODY}</html>`)),
		});

		expectError(result, "response");
	});

	it.each([
		[401, "auth"],
		[403, "auth"],
		[404, "response"],
		[429, "response"],
		[500, "response"],
		[503, "response"],
	])("classifies HTTP %i as %s", async (status, kind) => {
		const result = await discoverGroqModels({
			baseUrl: "https://user:pw@api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			fetch: fetchReturning(
				jsonResponse(
					{ error: { message: `${SECRET_BODY} ${SECRET_KEY}` } },
					status,
				),
			),
		});

		expectError(result, kind);
	});

	it("rejects redirects instead of following them", async () => {
		const result = await discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			fetch: fetchReturning(
				new Response(null, {
					status: 302,
					headers: { location: "https://elsewhere.example/models" },
				}),
			),
		});

		expectError(result, "response");
	});

	it("rejects a response that a fetch implementation already redirected", async () => {
		const redirected = jsonResponse({ data: [{ id: "a" }] });
		Object.defineProperty(redirected, "redirected", { value: true });

		const result = await discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			fetch: fetchReturning(redirected),
		});

		expectError(result, "response");
	});

	it("classifies transport failures as network errors", async () => {
		const fetch = vi.fn<DiscoveryFetch>(async () => {
			throw new TypeError(`fetch failed for ${SECRET_KEY}`);
		});

		const result = await discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			fetch,
		});

		expectError(result, "network");
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("rejects an unusable base URL without sending a request", async () => {
		const fetch = fetchReturning(jsonResponse({ data: [] }));

		const result = await discoverGroqModels({
			baseUrl: "not a url",
			apiKey: SECRET_KEY,
			fetch,
		});

		expectError(result, "network");
		expect(fetch).not.toHaveBeenCalled();
	});

	it("times out a request that never answers", async () => {
		const fetch = hangingFetch();

		const result = await discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			fetch,
			timeoutMs: 20,
		});

		expectError(result, "timeout");
		expect(fetch.mock.calls[0][1].signal?.aborted).toBe(true);
	});

	it("applies the deadline to body parsing", async () => {
		const stalled = {
			ok: true,
			status: 200,
			redirected: false,
			type: "basic",
			text: () => new Promise<string>(() => {}),
		} as unknown as Response;

		const result = await discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			fetch: fetchReturning(stalled),
			timeoutMs: 20,
		});

		expectError(result, "timeout");
	});

	it("defaults to a five-second deadline", async () => {
		vi.useFakeTimers();
		try {
			const pending = discoverGroqModels({
				baseUrl: "https://api.groq.com/openai/v1",
				apiKey: SECRET_KEY,
				fetch: hangingFetch(),
			});
			await vi.advanceTimersByTimeAsync(4_999);
			let settled = false;
			void pending.then(() => {
				settled = true;
			});
			await Promise.resolve();
			expect(settled).toBe(false);

			await vi.advanceTimersByTimeAsync(1);
			expectError(await pending, "timeout");
		} finally {
			vi.useRealTimers();
		}
	});

	it("reports caller cancellation as cancelled, not timeout", async () => {
		const controller = new AbortController();
		const fetch = hangingFetch();

		const pending = discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			signal: controller.signal,
			fetch,
		});
		controller.abort();

		expectError(await pending, "cancelled");
		expect(fetch.mock.calls[0][1].signal?.aborted).toBe(true);
	});

	it("does not send a request when already cancelled", async () => {
		const controller = new AbortController();
		controller.abort();
		const fetch = fetchReturning(jsonResponse({ data: [] }));

		const result = await discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			signal: controller.signal,
			fetch,
		});

		expectError(result, "cancelled");
		expect(fetch).not.toHaveBeenCalled();
	});

	it("does not retry after a failure", async () => {
		const fetch = fetchReturning(() => jsonResponse({}, 503));

		await discoverGroqModels({
			baseUrl: "https://api.groq.com/openai/v1",
			apiKey: SECRET_KEY,
			fetch,
		});

		expect(fetch).toHaveBeenCalledTimes(1);
	});
});

describe("reconcileGroqModels", () => {
	const catalog = {
		"openai/gpt-oss-120b": {
			id: "openai/gpt-oss-120b",
			capabilities: ["tools", "reasoning"],
		},
		"llama-3.1-8b-instant": {
			id: "llama-3.1-8b-instant",
			capabilities: ["tools"],
		},
		"catalog-only": { id: "catalog-only", capabilities: ["tools"] },
		"whisper-large-v3": {
			id: "whisper-large-v3",
			operation: "transcription" as const,
		},
		"audio-in": {
			id: "audio-in",
			capabilities: ["tools"],
			modalities: { input: ["audio"] as const, output: ["text"] as const },
		},
		"no-tools": { id: "no-tools", capabilities: ["reasoning"] },
		"no-capabilities": { id: "no-capabilities" },
		"empty-capabilities": { id: "empty-capabilities", capabilities: [] },
	};

	it("keeps only endpoint models the catalog proves can chat with tools", () => {
		expect(
			reconcileGroqModels(
				[
					"llama-3.1-8b-instant",
					"whisper-large-v3",
					"openai/gpt-oss-120b",
					"audio-in",
					"no-tools",
				],
				catalog,
			),
		).toEqual({
			eligible: ["llama-3.1-8b-instant", "openai/gpt-oss-120b"],
			unverified: [],
		});
	});

	it("never offers a catalog-only model the endpoint did not list", () => {
		const result = reconcileGroqModels(["openai/gpt-oss-120b"], catalog);

		expect(result.eligible).toEqual(["openai/gpt-oss-120b"]);
		expect([...result.eligible, ...result.unverified]).not.toContain(
			"catalog-only",
		);
	});

	it("marks models without capability evidence as unverified", () => {
		expect(
			reconcileGroqModels(
				[
					"meta-llama/llama-guard-4-12b",
					"no-capabilities",
					"empty-capabilities",
				],
				catalog,
			),
		).toEqual({
			eligible: [],
			unverified: [
				"meta-llama/llama-guard-4-12b",
				"no-capabilities",
				"empty-capabilities",
			],
		});
	});

	it("does not infer support from model names", () => {
		const result = reconcileGroqModels(
			["openai/gpt-oss-999b", "llama-3.3-70b-versatile-preview"],
			catalog,
		);

		expect(result).toEqual({
			eligible: [],
			unverified: ["openai/gpt-oss-999b", "llama-3.3-70b-versatile-preview"],
		});
	});

	it("returns nothing for an empty successful discovery", () => {
		expect(reconcileGroqModels([], catalog)).toEqual({
			eligible: [],
			unverified: [],
		});
	});
});
