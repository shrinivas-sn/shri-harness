# Project status

Single running log — update in place each session, don't fork new files or append without pruning stale lines. This is the primary source `/recap` reads for "where things stand."

## Current state — as of 22/09/2026
- The interactive Shri CLI uses the existing Cline execution engine with Groq `openai/gpt-oss-120b`; prior user-run live inference is recorded in `WORK/2026-09-22/WORK.md`.
- Normal CLI configuration defaults to `~/.shri`; packaged child/daemon isolation still needs verification.
- Last recorded source verification: 11 Shri test suites / 44 tests passed; not rerun during the final static review. This does not prove installed-package behavior.
- The custom `shri:pipeline` has scaffolding and simulated execution; its reported run record is not written to disk. Real custom multi-agent execution is deferred.
- Last recorded CLI build failed on missing Hub webview/Vite dependencies; not rerun during this review. No release artifact or npm installation has passed acceptance yet.
- User approved planning a single-agent npm preview first, with real multi-agent functionality afterward.
- `PLAN.md` is the canonical revised execution plan. No implementation task has started; no package was published.
- `/model` crashes in the user's Windows TUI. Leading hypothesis: an unfiltered zero-token transcription row produces a bare numeric child; real-renderer reproduction and fix remain pending.
- Final source review found two auth gaps: bare `shri auth` reuses saved keys, and startup lets saved keys bypass environment precedence. Tasks 1 and 5 now include explicit regression requirements; runtime proof remains pending.

## Pending
- Execute `PLAN.md` Task 0 (`/model` crash) first, then Tasks 1–7 sequentially with no subagents. The crash blocks the preview release.
- Confirm destination GitHub repository before release workflow setup; no remote was configured when inspected.
- Public npm publication requires explicit approval after concrete artifacts and verification are reviewable.
- Resume in `E:\shri-harness` on existing branch `main`, using GPT-5.6 Terra / high selected by the user. Preserve unrelated changes; this checkpoint changes documentation only.

## Reference documentation
- `PLAN.md`: Node launcher plus embedded-Bun executable distribution for `@shrinivas-sn/shri@next`.
- `WORK/2026-09-22/WORK.md`, “Final static review and Terra handoff”: source locations, plan assessment, auth acceptance details and verification limits.
- `WORK/2026-09-22/npm-packaging-reference-superseded.md`: Original packaging reference preserved for history; its Node-runtime recommendation and direct-publish instructions are superseded.

## Next up (start here)
1. In the existing workspace `E:\shri-harness`, read `DOCS/PLAN.md` Task 0 and reproduce `/model` with a bounded real-renderer test plus Windows interaction. Confirm the zero-child hypothesis before implementing; add regression coverage and carry the flow into installed-package tests. Current evidence is source/catalog inspection and the user's screenshot, not an agent-verified fix.
