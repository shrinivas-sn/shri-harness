# 07/10/2026 — Phase 1 commit and Task 9.1

Continues: [26/09/2026 work](../2026-09-26/WORK.md) and [the live plan](../../PLAN.md).

## Scope

Owner asked to commit Phase 1 and continue the plan. Preflight: owner `SSN-INSPIRON-35\Dell` matched; branch `main`; only the recorded Phase 1/planning changes were uncommitted.

## Phase 1 commit

Re-ran the bounded Task 8 gate before committing: 182/182 tests, LLM and shared typechecks exit 0. Committed the fix with its evidence logs as `8b16b5a`, then the restructured plan and status docs as `efd82f7`. Git tracks the folder as `docs/` while disk shows `DOCS/`; tracked files must be staged with the lowercase path.

## Task 9.1

- New `apps/cli/src/utils/groq-model-discovery.ts` and `.test.ts`. No existing file changed.
- Red: [task-9.1-red.log](task-9.1-red.log) (module missing).
- Green: [task-9.1-green.log](task-9.1-green.log) 37/37; [task-9.1-typecheck.log](task-9.1-typecheck.log) exit 0.
- Mutation check: [task-9.1-mutation.log](task-9.1-mutation.log), 11 targeted failures against naive code.
- Decisions: unparsable base URL → `network`, no request; optional `timeoutMs` for tests, default 5,000 ms.

Committed as `4e107a2`.

## Task 9.2 and Phase 2 checkpoint

- New `apps/cli/src/tui/hooks/groq-model-selection.ts` and `.test.ts`; edited `use-model-selector.tsx`, `model-selector.tsx` (two optional props) and its render test.
- Probe: Vitest cannot import `use-model-selector.tsx` (`@opentui/react` → missing `react-reconciler/constants`). Probe file deleted. Plan issue 3.
- Red: [task-9.2-red.log](task-9.2-red.log) (module missing); [task-9.2-render-red.log](task-9.2-render-red.log) (2 new render cases fail on the old component).
- Green: [task-9.2-green.log](task-9.2-green.log) 49/49; [task-9.2-typecheck.log](task-9.2-typecheck.log) exit 0; [task-9.2-render.log](task-9.2-render.log) 5/5.
- Open owner question: Plan issue 4 (saved model after a failed apply).

Committed as `75db91c`.

## Task 10 and Phase 3 checkpoint

- Docs re-check: Groq reasoning.md/models.md fetched 07/10/2026; brief in `E:\dev-recipes\_knowledge\cache\groq-reasoning-controls.md`, registry entry `groq-api` added to `sources.yaml` (dev-recipes changes not committed).
- Pre-fix actual bodies: [task-10-bodies-before.txt](task-10-bodies-before.txt). Probe test deleted after use.
- Red: [wire](task-10-red-wire.log), [CLI render](task-10-cli-render-red.log), [controller](task-10-cli-controller-red.log).
- Green: [SDK 399/399](task-10-green.log), [LLM typecheck](task-10-llms-typecheck.log), [shared typecheck](task-10-shared-typecheck.log), [CLI unit 50/50](task-10-cli-unit.log), [CLI typecheck](task-10-cli-typecheck.log), [render 8/8](task-10-cli-render.log).
- Open: Plan issues 4 (saved-model rollback) and 6 (Safeguard effort, live check).

Committed as `ab3fa24`.

## Task 11.1

Matrix [groq-repair-test-matrix.md](../../RESEARCH/groq-repair-test-matrix.md), committed `d687d61`.

## Task 11.2 (in progress, harness uncommitted)

- Fresh build/package/verify: [task-11.2-build.log](task-11.2-build.log), all exit 0. Next.1 evidence preserved at `tmp/preserved/release-next.1` before `build.ts` wiped `apps/cli/dist`.
- Model PTY runs 1–5: [1](task-11.2-model-run1.log) [2](task-11.2-model-run2.log) [3](task-11.2-model-run3.log) [4](task-11.2-model-run4.log) [5](task-11.2-model-run5.log). Run 5: all four installed switches sent the expected bodies; failed later at a harness wait.
- Conversation PTY script written, not run. E2E assertions not updated.

## Task 11.2 continued (later session)

- Model PTY [run 6](task-11.2-model-run6.log) passed every check; runs [7](task-11.2-model-run7.log)–[11](task-11.2-model-run11.log) failed intermittently with the prompt not taking keys after a dialog closed. Not fixed by retyping over 8 s, so this is a product focus defect, not timing: Plan issue 7.
- Harness: live screen first in failure detail, caller-labelled picker stages, echo-checked typing with an `inputRetries` count (both PTY scripts).
- Conversation PTY [run 1](task-11.2-conversation-run1.log): all checks passed.

## Plan issue 7 fix and Task 11.2 checkpoint (third session)

- Owner said fix issue 7 in this plan, and put a new Groq key in `.env` (presence checked only).
- Escape and Tab probes in the installed PTY: Escape did not revive the prompt; Tab toggled Plan/Act, so keys arrived and only focus was lost. A first renderer probe (synchronous commits) did not reproduce it and was deleted.
- An env-gated focus trace in a local build (not committed) showed the dialog library's 1 ms restore timer focusing the old textarea before React's passive-phase destroy.
- Fix: `use-focus-after-remount.ts` and its render test (calibration plus fix, render-time and layout-time steals). A first layout-effect version failed the installed runs 4/5; the passive-effect version passed 5/5.
- Harness typing made strict again; E2E asserts every check; matrix updated (12 proven). Evidence: `task-11.2-*` logs in this folder.

## Gap rows (08/10/2026, same thread)

- Pushed and hosted CI passed. Added the remaining installed checks; matrix 22/25 proven; installed E2E 9/9. Evidence: `task-11.2-gaps-*` logs. Details in the PLAN Progress Log.

## Resume

Continue Task 11.2 per DOCS/STATUS.md "Next up".
