// @jsxImportSource @opentui/react
import type { Llms } from "@cline/core";
import { DialogProvider } from "@opentui-ui/dialog/react";
import { testRender } from "@opentui/react/test-utils";
import { afterEach, describe, expect, test } from "bun:test";
import {
	buildModelOptions,
	ModelSelectorContent,
	type ModelOption,
} from "./model-selector";

let testSetup: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
	testSetup?.renderer.destroy();
	testSetup = undefined;
});

async function renderSelector(models: ModelOption[], currentModel = "") {
	testSetup = await testRender(
		<DialogProvider>
			<ModelSelectorContent
				dialogId="test-dialog"
				resolve={() => {}}
				dismiss={() => {}}
				currentModel={currentModel}
				currentProviderName="Groq"
				models={models}
			/>
		</DialogProvider>,
		{ width: 80, height: 30 },
	);
	await testSetup.renderOnce();
	return testSetup;
}

/**
 * Shape mirrors real Groq catalog entries (sdk/packages/llms/src/catalog/catalog.generated.ts,
 * provider "groq"): two zero-token transcription models alongside ordinary chat
 * models, so the picker sees exactly what triggered the reported crash — more
 * than MAX_VISIBLE (10) rows, exercising windowed rendering.
 */
const GROQ_CATALOG_FIXTURE: Record<string, Llms.ModelInfo> = {
	"whisper-large-v3": {
		id: "whisper-large-v3",
		name: "Whisper",
		contextWindow: 0,
		maxInputTokens: 0,
		maxTokens: 0,
		family: "whisper",
		operation: "transcription",
		modalities: { input: ["audio"], output: ["text"] },
	},
	"whisper-large-v3-turbo": {
		id: "whisper-large-v3-turbo",
		name: "Whisper Large V3 Turbo",
		contextWindow: 0,
		maxInputTokens: 0,
		maxTokens: 0,
		family: "whisper",
		operation: "transcription",
		modalities: { input: ["audio"], output: ["text"] },
	},
	"llama-3.1-8b-instant": {
		id: "llama-3.1-8b-instant",
		name: "Llama 3.1 8B",
		contextWindow: 131_072,
		maxInputTokens: 131_072,
		maxTokens: 131_072,
		family: "llama",
	},
	"qwen/qwen3.6-27b": {
		id: "qwen/qwen3.6-27b",
		name: "Qwen3.6 27B",
		contextWindow: 131_072,
		maxInputTokens: 131_072,
		maxTokens: 16_384,
		family: "qwen",
	},
	...Object.fromEntries(
		Array.from({ length: 9 }, (_, i) => [
			`groq/filler-model-${i}`,
			{
				id: `groq/filler-model-${i}`,
				name: `Filler Model ${i}`,
				maxInputTokens: 8_192,
				family: "filler",
			} satisfies Llms.ModelInfo,
		]),
	),
};

describe("ModelSelectorContent render regression", () => {
	test("buildModelOptions filters transcription models out of the Groq fixture at the picker boundary", () => {
		const options = buildModelOptions(GROQ_CATALOG_FIXTURE);

		expect(options.length).toBeGreaterThan(10);
		expect(options.some((o) => o.family === "whisper")).toBe(false);
		expect(options.some((o) => o.key === "llama-3.1-8b-instant")).toBe(true);
	});

	test("renders the real, unfiltered Groq fixture (incl. whisper) without a native renderer crash", async () => {
		const options = buildModelOptions(GROQ_CATALOG_FIXTURE);

		const setup = await renderSelector(options);
		const frame = setup.captureCharFrame();

		expect(frame).toContain("Select Model");
		expect(frame).not.toContain("Text must be created inside of a text node");
	});

	test("renders explicit rows with zero, missing, and positive token limits, windowed past MAX_VISIBLE", async () => {
		const models: ModelOption[] = [
			{
				key: "zero-token",
				name: "Zero Token Model",
				maxInputTokens: 0,
				supportsReasoning: false,
			},
			{
				key: "missing-token",
				name: "Missing Token Model",
				supportsReasoning: false,
			},
			{
				key: "positive-token",
				name: "Positive Token Model",
				maxInputTokens: 128_000,
				supportsReasoning: false,
			},
			...Array.from({ length: 10 }, (_, i) => ({
				key: `filler-${i}`,
				name: `Filler Model ${i}`,
				maxInputTokens: 4_096,
				supportsReasoning: false,
			})),
		];

		const setup = await renderSelector(models, "positive-token");
		const frame = setup.captureCharFrame();

		expect(frame).toContain("Select Model");
		expect(frame).toContain("(current)");
		expect(frame).not.toContain("Text must be created inside of a text node");
	});

	test("renders an empty catalog without a native renderer crash", async () => {
		const setup = await renderSelector([]);
		const frame = setup.captureCharFrame();

		expect(frame).toContain("Select Model");
		expect(frame).not.toContain("Text must be created inside of a text node");
	});

	test("renders without a native renderer crash when the current model is absent from the list", async () => {
		const models: ModelOption[] = [
			{
				key: "only-option",
				name: "Only Option",
				maxInputTokens: 0,
				supportsReasoning: false,
			},
		];

		const setup = await renderSelector(models, "not-in-the-list");
		const frame = setup.captureCharFrame();

		expect(frame).toContain("Select Model");
		expect(frame).toContain("Only Option");
		expect(frame).not.toContain("(current)");
		expect(frame).not.toContain("Text must be created inside of a text node");
	});
});
