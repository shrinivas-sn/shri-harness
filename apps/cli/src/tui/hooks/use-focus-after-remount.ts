import { useEffect } from "react";

/**
 * Focuses the prompt again once its keyed textarea has remounted.
 *
 * The new textarea focuses itself while rendering, but React destroys the old
 * one only in the passive effects phase. Anything that focuses the old
 * textarea in between — the dialog library restores saved focus on a 1 ms
 * timer — leaves nothing focused once it is destroyed. Passive mount effects
 * run after that destruction, and the timer skips destroyed renderables.
 */
export function useFocusAfterRemount(inputKey: number, focus: () => void) {
	useEffect(() => {
		if (inputKey === 0) return;
		focus();
	}, [inputKey, focus]);
}
