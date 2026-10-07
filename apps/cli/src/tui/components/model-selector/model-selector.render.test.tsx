// @jsxImportSource @opentui/react
import { expect, test } from "bun:test";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot } from "@opentui/react";
import { DialogProvider } from "@opentui-ui/dialog/react";
import { act } from "react";
import {
	buildModelOptions,
	type ModelOption,
	ModelSelectorContent,
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
	(
		globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
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

async function renderPicker(
	props: Partial<Parameters<typeof ModelSelectorContent>[0]>,
	interact?: (
		setup: Awaited<ReturnType<typeof createTestRenderer>>,
	) => Promise<void>,
): Promise<string> {
	(
		globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
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
						{...props}
					/>
				</DialogProvider>,
			);
		});
		await setup.renderOnce();
		if (interact) {
			await act(async () => {
				await interact(setup);
			});
			await setup.renderOnce();
		}
		return setup.captureCharFrame();
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
}

test("shows a discovery notice above cached Groq choices with sparse metadata", async () => {
	const frame = await renderPicker({
		notice:
			"Availability not verified: Could not reach the Groq models endpoint.",
	});

	expect(frame).toContain("Availability not verified");
	expect(frame).toContain("Legacy without token metadata");
	expect(frame).toContain("128K");
	expect(frame).not.toMatch(/Whisper Large V3 Turbo\s+0\b/);
});

test("renders no notice line when discovery verified the list", async () => {
	const frame = await renderPicker({});

	expect(frame).not.toContain("Availability not verified");
	expect(frame).not.toContain("capability data");
});

test("an empty verified Groq list offers only manual entry, with the capability warning", async () => {
	const listFrame = await renderPicker({
		models: [],
		notice:
			"Groq listed no models for this key. Use Create custom model ID to enter one.",
	});
	expect(listFrame).toContain("Groq listed no models");
	expect(listFrame).toContain("Create custom model ID");
	expect(listFrame).not.toContain("GPT OSS 120B");

	const entryFrame = await renderPicker(
		{
			models: [],
			customModelWarning:
				"Tool and reasoning support for manually entered models is not verified.",
		},
		async (setup) => {
			// Keyboard handling is scoped to an open dialog, so click the row.
			const lines = setup.captureCharFrame().split("\n");
			const y = lines.findIndex((line) =>
				line.includes("Create custom model ID"),
			);
			const x = lines[y]?.indexOf("Create custom model ID") ?? -1;
			expect(y).toBeGreaterThanOrEqual(0);
			await setup.mockMouse.click(x + 1, y);
		},
	);
	expect(entryFrame).toContain("Enter to create, Esc to go back");
	expect(entryFrame).toContain("manually entered models is not verified");
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
