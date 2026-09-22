// @jsxImportSource @opentui/react
import { expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { DialogProvider } from "@opentui-ui/dialog/react";
import { createRoot } from "@opentui/react";
import { act } from "react";
import {
	buildModelOptions,
	ModelSelectorContent,
	type ModelOption,
} from "./model-selector";

const groqModelOptions: ModelOption[] = [
	{
		key: "whisper-large-v3-turbo",
		name: "Whisper Large V3 Turbo",
		maxInputTokens: 0,
		supportsReasoning: false,
	},
	{
		key: "legacy-without-limit",
		name: "Legacy without token metadata",
		supportsReasoning: false,
	},
	{
		key: "openai/gpt-oss-120b",
		name: "GPT OSS 120B",
		maxInputTokens: 128_000,
		supportsReasoning: true,
	},
	...Array.from({ length: 9 }, (_, index) => ({
		key: `chat-model-${index}`,
		name: `Chat model ${index}`,
		maxInputTokens: 8_192,
		supportsReasoning: false,
	})),
];

test("renders a windowed Groq model picker with zero, missing, and positive token metadata", async () => {
	(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
		true;
	const setup = await createTestRenderer({ width: 100, height: 40 });
	const root = createRoot(setup.renderer);

	try {
		await act(async () => {
			root.render(
				<DialogProvider>
					<ModelSelectorContent
						dialogId={"model-selector" as never}
						dismiss={() => undefined}
						resolve={() => undefined}
						currentModel="openai/gpt-oss-120b"
						currentProviderName="Groq"
						models={groqModelOptions}
					/>
				</DialogProvider>,
			);
		});
		await setup.renderOnce();

		const frame = setup.captureCharFrame();
		expect(frame).toContain("GPT OSS 120B");
		expect(frame).toContain("128K");
		expect(frame).toContain("Whisper Large V3 Turbo");
	} finally {
		try {
			await act(async () => {
				root.unmount();
			});
		} finally {
			setup.renderer.destroy();
			(
				globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
			).IS_REACT_ACT_ENVIRONMENT = false;
		}
	}
});

test("excludes dedicated transcription models from picker options while retaining unknown catalog metadata", () => {
	const options = buildModelOptions({
		"whisper-large-v3-turbo": {
			id: "whisper-large-v3-turbo",
			name: "Whisper Large V3 Turbo",
			operation: "transcription",
			maxInputTokens: 0,
		},
		"openai/gpt-oss-120b": {
			id: "openai/gpt-oss-120b",
			name: "GPT OSS 120B",
			maxInputTokens: 128_000,
		},
		"unknown-metadata": {
			id: "unknown-metadata",
			name: "Unknown metadata",
		},
	} as never);

	expect(options.map((option) => option.key)).toEqual([
		"openai/gpt-oss-120b",
		"unknown-metadata",
	]);
});
