import type { KeyEvent } from "@opentui/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shouldHandleInputHistory } from "./root-keyboard-routing";
import { useRootKeyboard } from "./use-root-keyboard";

describe("root keyboard input history routing", () => {
	it("handles history while idle", () => {
		expect(
			shouldHandleInputHistory({
				isRunning: false,
				hasQueuedPrompts: false,
			}),
		).toBe(true);
	});

	it("handles history during a running turn when the prompt queue is empty", () => {
		expect(
			shouldHandleInputHistory({
				isRunning: true,
				hasQueuedPrompts: false,
			}),
		).toBe(true);
	});

	it("keeps running-turn arrow keys reserved for queued prompts when the queue is populated", () => {
		expect(
			shouldHandleInputHistory({
				isRunning: true,
				hasQueuedPrompts: true,
			}),
		).toBe(false);
	});
});

const keyboard = vi.hoisted(() => ({ handle: (_key: KeyEvent) => {} }));
vi.mock("@opentui/react", () => ({
	useKeyboard: (handle: (key: KeyEvent) => void) => {
		keyboard.handle = handle;
	},
}));
vi.mock("react", async (importOriginal) => ({
	...(await importOriginal<typeof import("react")>()),
	useRef: (current: unknown) => ({ current }),
}));
const sessionMock = vi.hoisted(() => ({
	isRunning: true,
	isExitRequested: false,
}));
vi.mock("../contexts/session-context", () => ({
	useSession: () => sessionMock,
}));

describe("empty-input queue steering", () => {
	it.each([
		{ text: "", shift: false, promote: true },
		{ text: "   ", shift: false, promote: true },
		{ text: "new draft", shift: false, promote: false },
		{ text: "", shift: true, promote: false },
	])("routes Enter with $text and shift=$shift", ({ text, shift, promote }) => {
		const promotePrompt = vi.fn();
		useRootKeyboard({
			isDialogOpen: false,
			appView: "chat",
			autocomplete: { mode: false },
			transcriptScrollRef: { current: null },
			getCurrentInputText: () => text,
			queuedPromptSelection: {
				items: [
					{ id: "first", prompt: "first", steer: false, attachmentCount: 0 },
					{ id: "second", prompt: "second", steer: false, attachmentCount: 0 },
				],
				selectedId: null,
				editingId: null,
				promote: promotePrompt,
			},
		} as unknown as Parameters<typeof useRootKeyboard>[0]);
		const preventDefault = vi.fn();
		keyboard.handle({
			name: "return",
			ctrl: false,
			meta: false,
			shift,
			repeated: false,
			preventDefault,
		} as unknown as KeyEvent);
		expect(promotePrompt).toHaveBeenCalledTimes(promote ? 1 : 0);
		if (promote) {
			expect(promotePrompt).toHaveBeenCalledWith("first");
			expect(preventDefault).toHaveBeenCalledOnce();
		}
	});
});

describe("Ctrl+C double-press exit confirmation", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		sessionMock.isRunning = true;
		sessionMock.isExitRequested = false;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function useTestRootKeyboard(
		overrides: Partial<Parameters<typeof useRootKeyboard>[0]> = {},
	) {
		const onExit = vi.fn();
		const onExitHint = vi.fn();
		const onAbort = vi.fn(() => false);
		const onRestoreCheckpoint = vi.fn(async () => {});
		const setInputKey = vi.fn();
		const setInputValue = vi.fn();
		const syncInputFromTextarea = vi.fn();

		const props = {
			isDialogOpen: false,
			appView: "chat",
			autocomplete: { mode: false },
			inputHistory: { navigateHistory: vi.fn() },
			transcriptScrollRef: { current: null },
			inputValueRef: { current: "" },
			selectRef: { current: vi.fn() },
			submitRef: { current: vi.fn() },
			queuedPromptSelection: {
				items: [],
				selectedId: null,
				editingId: null,
				select: vi.fn(),
				beginEdit: vi.fn(),
				cancelEdit: vi.fn(),
				promote: vi.fn(),
			},
			syncInputFromTextarea,
			getCurrentInputText: () => "",
			setInputKey,
			setInputValue,
			onAbort,
			onExit,
			onExitHint,
			onToggleMode: vi.fn(),
			onClearConversation: vi.fn(async () => {}),
			onRestoreCheckpoint,
			onOpenCommandPalette: vi.fn(async () => {}),
			onCommandPaletteShortcut: vi.fn(() => false),
			...overrides,
		} as unknown as Parameters<typeof useRootKeyboard>[0];

		useRootKeyboard(props);

		const pressKey = (key: Partial<KeyEvent>) => {
			keyboard.handle({
				name: key.name ?? "",
				ctrl: key.ctrl ?? false,
				meta: key.meta ?? false,
				shift: key.shift ?? false,
				repeated: key.repeated ?? false,
				preventDefault: key.preventDefault ?? vi.fn(),
			} as unknown as KeyEvent);
		};

		const pressCtrlC = () => {
			pressKey({ name: "c", ctrl: true });
		};

		return {
			onExit,
			onExitHint,
			onAbort,
			onRestoreCheckpoint,
			setInputKey,
			setInputValue,
			syncInputFromTextarea,
			pressKey,
			pressCtrlC,
		};
	}

	it("should clear input when Ctrl+C is pressed with text in input, and NOT exit", () => {
		const { onExit, onExitHint, setInputKey, setInputValue, pressCtrlC } =
			useTestRootKeyboard({
				getCurrentInputText: () => "draft message",
			});

		pressCtrlC();

		expect(setInputKey).toHaveBeenCalledOnce();
		expect(setInputValue).toHaveBeenCalledWith("");
		expect(onExit).not.toHaveBeenCalled();
		expect(onExitHint).not.toHaveBeenCalled();
	});

	it("should NOT exit on first Ctrl+C with empty input, and should show hint", () => {
		const { onExit, onExitHint, pressCtrlC } = useTestRootKeyboard({
			getCurrentInputText: () => "",
		});

		pressCtrlC();

		expect(onExit).not.toHaveBeenCalled();
		expect(onExitHint).toHaveBeenCalledOnce();
	});

	it("should exit on second Ctrl+C within confirmation window", () => {
		const { onExit, onExitHint, pressCtrlC } = useTestRootKeyboard({
			getCurrentInputText: () => "",
		});

		pressCtrlC();
		expect(onExit).not.toHaveBeenCalled();
		expect(onExitHint).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(500); // within 1500ms window
		pressCtrlC();

		expect(onExit).toHaveBeenCalledOnce();
	});

	it("should NOT exit on second Ctrl+C after confirmation window expires", () => {
		const { onExit, onExitHint, pressCtrlC } = useTestRootKeyboard({
			getCurrentInputText: () => "",
		});

		pressCtrlC();
		expect(onExit).not.toHaveBeenCalled();
		expect(onExitHint).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1600); // window has expired
		pressCtrlC();

		expect(onExit).not.toHaveBeenCalled();
		expect(onExitHint).toHaveBeenCalledTimes(2);
	});

	it("should reset confirmation window when user types text", () => {
		let text = "";
		const { onExit, pressKey, pressCtrlC } = useTestRootKeyboard({
			getCurrentInputText: () => text,
		});

		pressCtrlC();
		expect(onExit).not.toHaveBeenCalled();

		// User types a character
		text = "a";
		pressKey({ name: "a" });

		// Back to empty input
		text = "";
		vi.advanceTimersByTime(200);

		// Now Ctrl+C should be a new first press, not an exit
		pressCtrlC();
		expect(onExit).not.toHaveBeenCalled();
	});

	it("should not change Escape behavior", () => {
		sessionMock.isRunning = true;
		const { onAbort, onExit, pressKey } = useTestRootKeyboard();

		pressKey({ name: "escape" });

		expect(onAbort).toHaveBeenCalledOnce();
		expect(onExit).not.toHaveBeenCalled();
	});

	it("should not change Ctrl+D behavior", () => {
		sessionMock.isRunning = false;
		const { onExit, pressKey } = useTestRootKeyboard({
			getCurrentInputText: () => "",
		});

		pressKey({ name: "d", ctrl: true });

		expect(onExit).toHaveBeenCalledOnce();
	});
});
