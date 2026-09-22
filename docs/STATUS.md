# Project status

Single running log — update in place each session, don't fork new files or append without pruning stale lines. This is the primary source `/recap` reads for "where things stand."

## Current state — as of 23/09/2026
- The interactive Shri CLI uses the existing Cline execution engine with Groq `openai/gpt-oss-120b`; prior user-run live inference is recorded in `WORK/2026-09-22/WORK.md`.
- Normal CLI configuration defaults to `~/.shri`; Task 1 now resolves and propagates the Shri storage environment before normal CLI, daemon, and ACP runtime access. Installed child/daemon proof remains Task 5.
- Last recorded source verification: 11 Shri test suites / 44 tests passed; not rerun during the final static review. This does not prove installed-package behavior.
- The custom `shri:pipeline` has scaffolding and simulated execution; its reported run record is not written to disk. Real custom multi-agent execution is deferred.
- Last recorded CLI build failed on missing Hub webview/Vite dependencies; not rerun during this review. No release artifact or npm installation has passed acceptance yet.
- User approved planning a single-agent npm preview first, with real multi-agent functionality afterward.
- `PLAN.md` is the canonical revised execution plan. Task 0 has a source fix and regression; no package was published.
- Task 0 is complete: `/model` has a real-renderer regression and Windows proof for opening, search, selection, Off, prompt return, Escape/cancel and reopen. Zero-token transcription rows are filtered/guarded; Groq Off omits unsupported `"none"` and hides GPT-OSS reasoning output. Installed-artifact repetition remains Task 5.
- Task 1 is in progress. Bare `shri auth` replaces saved keys with masked guidance/cancellation safety; source startup tests cover command-line > environment > saved precedence without persisting temporary overrides. The source package is private/Shri-preview identified, automatic updates are disabled, and the telemetry handle is no-op. Its complete prescribed unfiltered focused suite did not yield a final result from the host runner, so it is not passed.

## Pending
- Finish Task 1's unfiltered focused suite and self-review the remaining inherited updater/daemon boundary code. Task 5 still repeats Task 0 through installed artifacts.
- Confirm destination GitHub repository before release workflow setup; no remote was configured when inspected.
- Public npm publication requires explicit approval after concrete artifacts and verification are reviewable.
- Resume in `E:\shri-harness` on existing branch `main`, using GPT-5.6 Terra / high selected by the user. Preserve unrelated changes; current work includes the completed Task 0 source fixes/regressions and evidence record.

## Reference documentation
- `PLAN.md`: Node launcher plus embedded-Bun executable distribution for `@shrinivas-sn/shri@next`.
- `WORK/2026-09-22/WORK.md`, “Final static review and Terra handoff”: source locations, plan assessment, auth acceptance details and verification limits.
- `WORK/2026-09-22/npm-packaging-reference-superseded.md`: Original packaging reference preserved for history; its Node-runtime recommendation and direct-publish instructions are superseded.

## Next up (start here)
1. Continue Task 1 in `PLAN.md`: obtain a bounded final result for its required unfiltered focused suite, then complete its remaining self-review/checkboxes without claiming installed proof.
