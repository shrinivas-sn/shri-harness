// @jsxImportSource @opentui/react
import { expect, test } from "bun:test";
import type { Renderable } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";
import { createRoot } from "@opentui/react";
import {
	act,
	type ReactNode,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useFocusAfterRemount } from "./use-focus-after-remount";

type Handle = Renderable & { plainText: string };
type StealAt = "render" | "layout";

const noFocus = () => {};

/**
 * Remounts a keyed prompt while the old textarea re-takes focus before React
 * destroys it. In the installed binary the dialog library's 1 ms
 * focus-restore timer lands there: after the new textarea focused itself while
 * rendering, and possibly after layout effects, because React destroys deleted
 * instances only in the passive effects phase.
 */
async function remountWithStaleFocus(withHook: boolean, stealAt: StealAt) {
	(
		globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true;
	const setup = await createTestRenderer({ width: 40, height: 6 });
	const root = createRoot(setup.renderer);
	const api: { remount?: () => void; current?: () => Handle | null } = {};
	const theft: { stale?: Handle; stolen: boolean } = { stolen: false };
	const steal = () => {
		if (!theft.stale || theft.stolen) return;
		theft.stolen = true;
		theft.stale.focus();
	};

	/** Renders after the new textarea is created and focused, before commit. */
	function RenderSteal() {
		if (stealAt === "render") steal();
		return null;
	}

	/** Parent layout effects run after the prompt's own layout effects. */
	function Shell(props: { children: (inputKey: number) => ReactNode }) {
		const [inputKey, setInputKey] = useState(0);
		api.remount = () => setInputKey((key) => key + 1);
		useLayoutEffect(() => {
			if (stealAt === "layout" && inputKey > 0) steal();
		}, [inputKey]);
		return <box>{props.children(inputKey)}</box>;
	}

	function Prompt(props: { inputKey: number }) {
		const ref = useRef<Handle | null>(null);
		const focus = useCallback(() => ref.current?.focus(), []);
		useFocusAfterRemount(props.inputKey, withHook ? focus : noFocus);
		api.current = () => ref.current;
		return (
			<box>
				<textarea key={props.inputKey} ref={ref as never} focused />
				<RenderSteal />
			</box>
		);
	}

	try {
		await act(async () =>
			root.render(
				<Shell>{(inputKey) => <Prompt inputKey={inputKey} />}</Shell>,
			),
		);
		const stale = api.current?.() as Handle;
		expect(setup.renderer.currentFocusedRenderable).toBe(stale);

		theft.stale = stale;
		await act(async () => api.remount?.());

		const live = api.current?.() as Handle;
		const focused = setup.renderer.currentFocusedRenderable;
		await act(async () => {
			await setup.mockInput.typeText("hi");
		});
		return {
			stolen: theft.stolen,
			staleDestroyed: stale.isDestroyed,
			focusedIsLive: focused === live && live !== stale,
			typed: live.plainText,
		};
	} finally {
		await act(async () => root.unmount());
		setup.renderer.destroy();
	}
}

for (const stealAt of ["render", "layout"] as const) {
	test(`calibration: stale focus at ${stealAt} time leaves the prompt unfocused`, async () => {
		const result = await remountWithStaleFocus(false, stealAt);
		expect(result.stolen).toBe(true);
		expect(result.staleDestroyed).toBe(true);
		expect(result.focusedIsLive).toBe(false);
		expect(result.typed).toBe("");
	});

	test(`focuses the remounted prompt after stale focus at ${stealAt} time`, async () => {
		const result = await remountWithStaleFocus(true, stealAt);
		expect(result.stolen).toBe(true);
		expect(result.staleDestroyed).toBe(true);
		expect(result.focusedIsLive).toBe(true);
		expect(result.typed).toBe("hi");
	});
}
