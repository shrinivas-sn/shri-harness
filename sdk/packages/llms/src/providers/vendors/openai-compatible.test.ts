import type { LanguageModelV4 } from "@ai-sdk/provider";
import type {
	AgentModelEvent,
	GatewayProviderContext,
	GatewayResolvedProviderConfig,
} from "@cline/shared";
import { describe, expect, it, vi } from "vitest";
import { toGatewayRequestMessages } from "../compat";
import { createGateway } from "../gateway";
import { isOpenAIReasoningEraModelId } from "../model-facts";
import {
	createOpenAICompatibleProviderModule,
	withMaxCompletionTokensForReasoningModels,
} from "./openai-compatible";

describe("isOpenAIReasoningEraModelId", () => {
	it("matches o-series and gpt-5-family model ids", () => {
		for (const modelId of [
			"o1",
			"o1-mini",
			"o1-preview",
			"o3",
			"o3-mini",
			"o3-pro",
			"o4-mini",
			"o4-mini-2025-04-16",
			"openai/o3-mini",
			"azure-o1",
			"gpt-5",
			"gpt-5-mini",
			"gpt-5.2",
			"gpt-5.2-codex",
			"gpt-5-chat-latest",
			"gpt5-nano",
			"openai/gpt-5.2",
			"GPT-5-Mini",
			"azure-gpt-5-mini",
		]) {
			expect(isOpenAIReasoningEraModelId(modelId), modelId).toBe(true);
		}
	});

	it("does not match classic or non-OpenAI model ids", () => {
		for (const modelId of [
			"gpt-4o",
			"gpt-4o-mini",
			"chatgpt-4o-latest",
			"gpt-4.1",
			"gpt-oss-120b",
			"gpt-35-turbo",
			"deepseek-v4-pro",
			"deepseek-reasoner",
			"qwen3-coder-plus",
			"llama-3.1-405b-instruct",
			"claude-sonnet-4-6",
			"yolo1",
			"solo3",
			"o13-custom",
			"grok-4",
			"chatgpt-5",
			"somegpt-5-custom",
			"xgpt5",
		]) {
			expect(isOpenAIReasoningEraModelId(modelId), modelId).toBe(false);
		}
	});

	it("returns false for missing or blank ids", () => {
		expect(isOpenAIReasoningEraModelId(undefined)).toBe(false);
		expect(isOpenAIReasoningEraModelId("")).toBe(false);
		expect(isOpenAIReasoningEraModelId("   ")).toBe(false);
	});
});

describe("withMaxCompletionTokensForReasoningModels", () => {
	it("renames max_tokens to max_completion_tokens for reasoning-era models", () => {
		const body = withMaxCompletionTokensForReasoningModels({
			model: "gpt-5.2",
			max_tokens: 8_192,
			messages: [],
		});

		expect(body).toEqual({
			model: "gpt-5.2",
			max_completion_tokens: 8_192,
			messages: [],
		});
	});

	it("leaves non-reasoning models untouched", () => {
		const body = {
			model: "gpt-4o",
			max_tokens: 8_192,
			messages: [],
		};

		expect(withMaxCompletionTokensForReasoningModels(body)).toBe(body);
	});

	it("leaves reasoning-era requests without max_tokens untouched", () => {
		const body = { model: "o3-mini", messages: [] };

		expect(withMaxCompletionTokensForReasoningModels(body)).toBe(body);
	});

	it("keeps an explicit max_completion_tokens from provider options", () => {
		const body = withMaxCompletionTokensForReasoningModels({
			model: "o4-mini",
			max_tokens: 8_192,
			max_completion_tokens: 1_024,
		});

		expect(body).toEqual({
			model: "o4-mini",
			max_completion_tokens: 1_024,
		});
	});

	it("leaves bodies without a string model id untouched", () => {
		const body = { max_tokens: 8_192 };

		expect(withMaxCompletionTokensForReasoningModels(body)).toBe(body);
	});
});

describe("createOpenAICompatibleProviderModule wire format", () => {
	it("sends max_completion_tokens instead of max_tokens for gpt-5-family generate requests", async () => {
		const { fetchMock, requestBody } = await generate({ modelId: "gpt-5.2" });

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(requestBody()).toMatchObject({
			model: "gpt-5.2",
			max_completion_tokens: 8_192,
		});
		expect(requestBody()).not.toHaveProperty("max_tokens");
	});

	it("sends max_completion_tokens instead of max_tokens for o-series streaming requests", async () => {
		const { requestBody } = await stream({ modelId: "o3-mini" });

		expect(requestBody()).toMatchObject({
			model: "o3-mini",
			max_completion_tokens: 8_192,
			stream: true,
		});
		expect(requestBody()).not.toHaveProperty("max_tokens");
	});

	it("keeps max_tokens for ordinary model ids", async () => {
		const { requestBody } = await generate({ modelId: "gpt-4o" });

		expect(requestBody()).toMatchObject({
			model: "gpt-4o",
			max_tokens: 8_192,
		});
		expect(requestBody()).not.toHaveProperty("max_completion_tokens");
	});

	// Regression test for cline/cline#13119: LiteLLM's Anthropic passthrough
	// emits tool_call deltas whose `index` mirrors the Anthropic content-block
	// index (1 when a text block precedes the tool call). Older
	// @ai-sdk/provider-utils stored tool calls in a sparse array keyed by that
	// index and crashed at stream flush with
	// "Cannot read properties of undefined (reading 'hasFinished')".
	it("survives streamed tool_call deltas whose index does not start at 0", async () => {
		const fetchMock = createFetchMock(
			sseToolCallResponseWithNonZeroIndex("claude-opus"),
		);
		const model = await createModel({ modelId: "claude-opus", fetchMock });

		const { stream } = await model.doStream({
			prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
			maxOutputTokens: 8_192,
		});

		const parts = await collectStreamParts(stream);

		expect(parts.filter((part) => part.type === "error")).toEqual([]);
		expect(parts.find((part) => part.type === "tool-call")).toMatchObject({
			toolCallId: "toolu_abc",
			toolName: "read_file",
			input: '{"path":"a.txt"}',
		});
	});
});

// Exercise the real gateway, AI SDK and installed compatible adapter. Only HTTP
// is replaced: the fixture rejects exactly the unsupported assistant field.
describe.each([
	"openai/gpt-oss-120b",
	"openai/gpt-oss-20b",
])("Groq serialized history for %s", (modelId) => {
	it.each([
		false,
		true,
	])("accepts follow-up and resumed history (tool call: %s)", async (withTool) => {
		const bodies: Array<{
			model: string;
			messages: Array<Record<string, unknown>>;
		}> = [];
		const rejected: number[] = [];
		const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
			const body = JSON.parse(String(init?.body));
			bodies.push(body);
			if (
				body.messages.some(
					(message: Record<string, unknown>) =>
						message.role === "assistant" && "reasoning_content" in message,
				)
			) {
				rejected.push(bodies.length);
				return new Response(
					JSON.stringify({
						error: {
							message: "property 'reasoning_content' is unsupported",
							type: "invalid_request_error",
						},
					}),
					{
						status: 400,
						headers: { "content-type": "application/json" },
					},
				);
			}
			return reasoningCompletionResponse(
				modelId,
				withTool && bodies.length === 1,
			);
		});
		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "groq",
					apiKey: "synthetic-key",
					baseUrl: "http://127.0.0.1:1/v1",
					fetch: fetchMock as unknown as typeof fetch,
				},
			],
		});
		const tools = [
			{
				name: "read_file",
				description: "Read a synthetic fixture",
				inputSchema: {
					type: "object",
					properties: { path: { type: "string" } },
					required: ["path"],
				},
			},
		];
		async function send(saved: Parameters<typeof toGatewayRequestMessages>[0]) {
			const savedBefore = structuredClone(saved);
			const messages = toGatewayRequestMessages(saved);
			const before = structuredClone(messages);
			const events = await collectGatewayEvents(
				await gateway.stream({ providerId: "groq", modelId, messages, tools }),
			);
			expect(messages).toEqual(before);
			expect(saved).toEqual(savedBefore);
			return events;
		}
		const saved: Parameters<typeof toGatewayRequestMessages>[0] = [
			{ role: "user", content: "Hello" },
		];
		const first = await send(saved);
		expect(first.filter((event) => event.type === "error")).toEqual([]);
		expect(first).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "reasoning-delta",
					text: "fixture reasoning",
				}),
				expect.objectContaining({ type: "text-delta", text: "Hello!" }),
			]),
		);
		expect(bodies[0].messages).toEqual([{ role: "user", content: "Hello" }]);
		const reasoning = first
			.filter((event) => event.type === "reasoning-delta")
			.map((event) => event.text)
			.join("");
		const text = first
			.filter((event) => event.type === "text-delta")
			.map((event) => event.text)
			.join("");
		saved.push(
			{
				role: "assistant",
				content: [
					{
						type: "thinking",
						thinking: "saved reasoning-only turn",
						signature: "saved-signature",
					},
				],
			},
			{
				role: "assistant",
				content: [
					{ type: "thinking", thinking: reasoning },
					{ type: "text", text },
				],
			},
		);
		if (withTool) {
			const call = first.find(
				(event) =>
					event.type === "tool-call-delta" && event.input !== undefined,
			);
			expect(call).toMatchObject({
				toolCallId: "call_fixture",
				toolName: "read_file",
				input: { path: "fixture.txt" },
			});
			if (!call || call.type !== "tool-call-delta")
				throw new Error("Missing fixture tool call");
			const assistant = saved[2].content;
			if (!Array.isArray(assistant))
				throw new Error("Expected saved content blocks");
			assistant.push({
				type: "tool_use",
				id: "stored_fixture",
				call_id: call.toolCallId,
				name: call.toolName,
				input: call.input as Record<string, unknown>,
			});
			saved.push({
				role: "user",
				content: [
					{
						type: "tool_result",
						tool_use_id: call.toolCallId,
						content: "fixture contents",
					},
				],
			});
		} else {
			saved.push({ role: "user", content: "Continue" });
		}

		const second = await send(saved);
		const followUp = bodies[1].messages;
		// This absence assertion must fail against the pre-repair serializer.
		for (const message of followUp)
			expect.soft(message).not.toHaveProperty("reasoning_content");
		expect.soft(rejected).toEqual([]);
		expect(second.filter((event) => event.type === "error")).toEqual([]);
		expect(followUp).toEqual(
			withTool
				? [
						{ role: "user", content: "Hello" },
						{
							role: "assistant",
							content: "Hello!",
							tool_calls: [
								{
									id: "call_fixture",
									type: "function",
									function: {
										name: "read_file",
										arguments: '{"path":"fixture.txt"}',
									},
								},
							],
						},
						{
							role: "tool",
							tool_call_id: "call_fixture",
							content: "fixture contents",
						},
					]
				: [
						{ role: "user", content: "Hello" },
						{ role: "assistant", content: "Hello!" },
						{ role: "user", content: "Continue" },
					],
		);
		expect(second).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: "reasoning-delta",
					text: "fixture reasoning",
				}),
			]),
		);

		// Resume a JSON-shaped transcript through a fresh gateway, retaining all
		// stored reasoning. No user history or filesystem settings are involved.
		saved.push(
			{
				role: "assistant",
				content: [
					{
						type: "thinking",
						thinking: second
							.filter((event) => event.type === "reasoning-delta")
							.map((event) => event.text)
							.join(""),
					},
					{
						type: "text",
						text: second
							.filter((event) => event.type === "text-delta")
							.map((event) => event.text)
							.join(""),
					},
				],
			},
			{ role: "user", content: "Again" },
		);
		const before = structuredClone(saved);
		const resumed = JSON.parse(JSON.stringify(saved)) as typeof saved;
		const resumedGateway = createGateway({
			providerConfigs: [
				{
					providerId: "groq",
					apiKey: "synthetic-key",
					baseUrl: "http://127.0.0.1:1/v1",
					fetch: fetchMock as unknown as typeof fetch,
				},
			],
		});
		const resumedMessages = toGatewayRequestMessages(resumed);
		const messagesBefore = structuredClone(resumedMessages);
		const third = await collectGatewayEvents(
			await resumedGateway.stream({
				providerId: "groq",
				modelId,
				messages: resumedMessages,
				tools,
			}),
		);
		expect(third.filter((event) => event.type === "error")).toEqual([]);
		expect(third).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: "text-delta", text: "Hello!" }),
			]),
		);
		expect(bodies).toHaveLength(3);
		expect(bodies.map((body) => body.model)).toEqual([
			modelId,
			modelId,
			modelId,
		]);
		expect(bodies[2].messages).toEqual([
			...followUp,
			{ role: "assistant", content: "Hello!" },
			{ role: "user", content: "Again" },
		]);
		expect(rejected).toEqual([]);
		expect(resumedMessages).toEqual(messagesBefore);
		expect(resumed).toEqual(before);
		expect(saved).toEqual(before);
	});
});

it("preserves serialized reasoning for an unrelated compatible provider", async () => {
	const fetchMock = createFetchMock(() =>
		reasoningCompletionResponse("openai/gpt-oss-120b"),
	);
	const gateway = createGateway({
		providerConfigs: [
			{
				providerId: "openai-compatible",
				apiKey: "synthetic-key",
				baseUrl: "http://127.0.0.1:1/v1",
				fetch: fetchMock as unknown as typeof fetch,
			},
		],
	});
	const saved: Parameters<typeof toGatewayRequestMessages>[0] = [
		{ role: "user", content: "Hello" },
		{
			role: "assistant",
			content: [
				{ type: "thinking", thinking: "keep this reasoning" },
				{ type: "text", text: "Hello!" },
			],
		},
		{ role: "user", content: "Continue" },
	];
	const messages = toGatewayRequestMessages(saved);
	const before = structuredClone(messages);
	const events = await collectGatewayEvents(
		await gateway.stream({
			providerId: "openai-compatible",
			modelId: "openai/gpt-oss-120b",
			messages,
		}),
	);
	expect(events.filter((event) => event.type === "error")).toEqual([]);
	expect(capturedBody(fetchMock).messages).toEqual([
		{ role: "user", content: "Hello" },
		{
			role: "assistant",
			content: "Hello!",
			reasoning_content: "keep this reasoning",
		},
		{ role: "user", content: "Continue" },
	]);
	expect(messages).toEqual(before);
});

async function collectGatewayEvents(
	stream: AsyncIterable<AgentModelEvent>,
): Promise<AgentModelEvent[]> {
	const events: AgentModelEvent[] = [];
	for await (const event of stream) events.push(event);
	return events;
}

function reasoningCompletionResponse(
	modelId: string,
	withTool = false,
): Response {
	const chunks = [
		{
			choices: [
				{
					index: 0,
					delta: { role: "assistant", reasoning: "fixture reasoning" },
				},
			],
		},
		{ choices: [{ index: 0, delta: { content: "Hello!" } }] },
		...(withTool
			? [
					{
						choices: [
							{
								index: 0,
								delta: {
									tool_calls: [
										{
											index: 0,
											id: "call_fixture",
											type: "function",
											function: {
												name: "read_file",
												arguments: '{"path":"fixture.txt"}',
											},
										},
									],
								},
							},
						],
					},
				]
			: []),
		{
			choices: [
				{
					index: 0,
					delta: {},
					finish_reason: withTool ? "tool_calls" : "stop",
				},
			],
			usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
		},
	];
	const data = chunks.map(
		(chunk) =>
			`data: ${JSON.stringify({ id: "chatcmpl-history", created: 0, model: modelId, ...chunk })}`,
	);
	return new Response([...data, "data: [DONE]", ""].join("\n\n"), {
		status: 200,
		headers: { "content-type": "text/event-stream" },
	});
}

async function createModel(input: {
	modelId: string;
	fetchMock: ReturnType<typeof vi.fn>;
}): Promise<LanguageModelV4> {
	const provider = await createOpenAICompatibleProviderModule(
		config({ fetch: input.fetchMock as unknown as typeof fetch }),
		context(),
	);
	return provider.operations.language(input.modelId) as LanguageModelV4;
}

async function generate(input: { modelId: string }) {
	const fetchMock = createFetchMock(jsonCompletionResponse(input.modelId));
	const model = await createModel({ modelId: input.modelId, fetchMock });

	await model.doGenerate({
		prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
		maxOutputTokens: 8_192,
	});

	return { fetchMock, requestBody: () => capturedBody(fetchMock) };
}

async function stream(input: { modelId: string }) {
	const fetchMock = createFetchMock(sseCompletionResponse(input.modelId));
	const model = await createModel({ modelId: input.modelId, fetchMock });

	await model.doStream({
		prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
		maxOutputTokens: 8_192,
	});

	return { fetchMock, requestBody: () => capturedBody(fetchMock) };
}

function createFetchMock(response: () => Response) {
	return vi.fn(async (_input: unknown, _init?: RequestInit) => response());
}

function capturedBody(
	fetchMock: ReturnType<typeof createFetchMock>,
): Record<string, unknown> {
	const init = fetchMock.mock.calls[0]?.[1];
	return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

function jsonCompletionResponse(modelId: string): () => Response {
	return () =>
		new Response(
			JSON.stringify({
				id: "chatcmpl-test",
				created: 0,
				model: modelId,
				choices: [
					{
						index: 0,
						message: { role: "assistant", content: "OK" },
						finish_reason: "stop",
					},
				],
				usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
			}),
			{ status: 200, headers: { "content-type": "application/json" } },
		);
}

function sseCompletionResponse(modelId: string): () => Response {
	const events = [
		`data: ${JSON.stringify({
			id: "chatcmpl-test",
			created: 0,
			model: modelId,
			choices: [{ index: 0, delta: { role: "assistant", content: "OK" } }],
		})}`,
		`data: ${JSON.stringify({
			id: "chatcmpl-test",
			created: 0,
			model: modelId,
			choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
			usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
		})}`,
		"data: [DONE]",
		"",
	].join("\n\n");
	return () =>
		new Response(events, {
			status: 200,
			headers: { "content-type": "text/event-stream" },
		});
}

async function collectStreamParts(
	stream: ReadableStream<unknown>,
): Promise<Array<Record<string, unknown> & { type: string }>> {
	const parts: Array<Record<string, unknown> & { type: string }> = [];
	const reader = stream.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		parts.push(value as Record<string, unknown> & { type: string });
	}
	return parts;
}

function sseToolCallResponseWithNonZeroIndex(modelId: string): () => Response {
	const events = [
		`data: ${JSON.stringify({
			id: "chatcmpl-test",
			created: 0,
			model: modelId,
			choices: [
				{ index: 0, delta: { role: "assistant", content: "Let me check." } },
			],
		})}`,
		// Anthropic content block 0 is the text above, so the tool call
		// arrives with index 1 and the tracker never sees an index-0 delta.
		`data: ${JSON.stringify({
			id: "chatcmpl-test",
			created: 0,
			model: modelId,
			choices: [
				{
					index: 0,
					delta: {
						tool_calls: [
							{
								index: 1,
								id: "toolu_abc",
								type: "function",
								function: {
									name: "read_file",
									arguments: '{"path":"a.txt"}',
								},
							},
						],
					},
				},
			],
		})}`,
		`data: ${JSON.stringify({
			id: "chatcmpl-test",
			created: 0,
			model: modelId,
			choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
			usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
		})}`,
		"data: [DONE]",
		"",
	].join("\n\n");
	return () =>
		new Response(events, {
			status: 200,
			headers: { "content-type": "text/event-stream" },
		});
}

function config(
	overrides: Partial<GatewayResolvedProviderConfig> = {},
): GatewayResolvedProviderConfig {
	return {
		providerId: "openai-compatible",
		apiKey: "test-api-key",
		baseUrl: "https://api.openai.com/v1",
		...overrides,
	};
}

function context(): GatewayProviderContext {
	return {
		provider: {
			id: "openai-compatible",
			name: "OpenAI Compatible",
			defaultModelId: "gpt-4o",
			models: [],
		},
		model: {
			providerId: "openai-compatible",
			id: "gpt-4o",
			name: "gpt-4o",
		},
		config: config(),
	} as unknown as GatewayProviderContext;
}

// Task 10: Groq receives only reasoning fields the selected model supports.
// Expected bodies follow Groq's reasoning docs (checked 07/10/2026) and the
// catalog's per-model controls; only HTTP is replaced.
describe("Groq reasoning request bodies", () => {
	type Intent =
		| "unset"
		| "off"
		| "on"
		| "low"
		| "medium"
		| "high"
		| "xhigh"
		| "minimal";
	const intents: Record<Intent, GatewayStreamRequestReasoning> = {
		unset: undefined,
		off: { enabled: false },
		on: { enabled: true },
		low: { enabled: true, effort: "low" },
		medium: { enabled: true, effort: "medium" },
		high: { enabled: true, effort: "high" },
		xhigh: { enabled: true, effort: "xhigh" },
		minimal: { enabled: true, effort: "minimal" },
	};
	const effortBodies = (visibility: boolean) => ({
		unset: {},
		off: visibility ? { include_reasoning: false } : {},
		on: {},
		low: { reasoning_effort: "low" },
		medium: { reasoning_effort: "medium" },
		high: { reasoning_effort: "high" },
		xhigh: { reasoning_effort: "high" },
		minimal: { reasoning_effort: "low" },
	});
	const noReasoning = Object.fromEntries(
		Object.keys(intents).map((intent) => [intent, {}]),
	) as Record<Intent, Record<string, unknown>>;
	const expected: Record<string, Record<Intent, Record<string, unknown>>> = {
		"openai/gpt-oss-120b": effortBodies(true),
		"openai/gpt-oss-20b": effortBodies(true),
		"openai/gpt-oss-safeguard-20b": effortBodies(false),
		"qwen/qwen3.8-27b": effortBodies(false),
		"qwen/qwen3.6-27b": noReasoning,
		"llama-3.1-8b-instant": noReasoning,
		"manual/unknown-model": noReasoning,
	};

	function reasoningFields(body: Record<string, unknown>) {
		return Object.fromEntries(
			Object.entries(body).filter(([key]) =>
				["reasoning_effort", "include_reasoning", "reasoning_format"].includes(
					key,
				),
			),
		);
	}

	function groqGateway(bodies: Array<Record<string, unknown>>) {
		const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
			bodies.push(JSON.parse(String(init?.body)));
			return reasoningCompletionResponse("fixture");
		});
		return createGateway({
			providerConfigs: [
				{
					providerId: "groq",
					apiKey: "synthetic-key",
					baseUrl: "http://127.0.0.1:1/v1",
					fetch: fetchMock as unknown as typeof fetch,
				},
			],
		});
	}

	async function send(
		gateway: ReturnType<typeof createGateway>,
		modelId: string,
		reasoning: GatewayStreamRequestReasoning,
	) {
		await collectGatewayEvents(
			await gateway.stream({
				providerId: "groq",
				modelId,
				messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
				reasoning,
			}),
		);
	}

	describe.each(Object.keys(expected))("%s", (modelId) => {
		it.each(
			Object.keys(intents) as Intent[],
		)("reasoning %s", async (intent) => {
			const bodies: Array<Record<string, unknown>> = [];
			await send(groqGateway(bodies), modelId, intents[intent]);

			expect(bodies).toHaveLength(1);
			expect(reasoningFields(bodies[0])).toEqual(expected[modelId][intent]);
		});
	});

	it("follows the selected model across reasoning → non-reasoning → reasoning switches", async () => {
		const bodies: Array<Record<string, unknown>> = [];
		const gateway = groqGateway(bodies);
		const legacyEffort = intents.xhigh;

		await send(gateway, "openai/gpt-oss-120b", legacyEffort);
		await send(gateway, "llama-3.1-8b-instant", legacyEffort);
		await send(gateway, "manual/unknown-model", intents.off);
		await send(gateway, "openai/gpt-oss-20b", intents.off);
		await send(gateway, "qwen/qwen3.8-27b", intents.low);

		expect(bodies.map((body) => [body.model, reasoningFields(body)])).toEqual([
			["openai/gpt-oss-120b", { reasoning_effort: "high" }],
			["llama-3.1-8b-instant", {}],
			["manual/unknown-model", {}],
			["openai/gpt-oss-20b", { include_reasoning: false }],
			["qwen/qwen3.8-27b", { reasoning_effort: "low" }],
		]);
	});

	it("keeps generic OpenAI-compatible providers on their existing reasoning behavior", async () => {
		const bodies: Array<Record<string, unknown>> = [];
		const fetchMock = vi.fn(async (_input: unknown, init?: RequestInit) => {
			bodies.push(JSON.parse(String(init?.body)));
			return reasoningCompletionResponse("fixture");
		});
		const gateway = createGateway({
			providerConfigs: [
				{
					providerId: "openai-compatible",
					apiKey: "synthetic-key",
					baseUrl: "http://127.0.0.1:1/v1",
					fetch: fetchMock as unknown as typeof fetch,
				},
			],
		});

		await collectGatewayEvents(
			await gateway.stream({
				providerId: "openai-compatible",
				modelId: "manual/unknown-model",
				messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
				reasoning: { enabled: true, effort: "low" },
			}),
		);

		expect(bodies).toHaveLength(1);
		expect(bodies[0]).not.toHaveProperty("include_reasoning");
	});
});

type GatewayStreamRequestReasoning = Parameters<
	ReturnType<typeof createGateway>["stream"]
>[0]["reasoning"];
