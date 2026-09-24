# Project status

## Current state - 24/09/2026
- Workspace: `E:\shri-harness`; branch: `main`. This checkpoint changes documentation only.
- Published and globally installed Windows x64 preview: `@shrinivas-sn/shri@0.1.0-next.1`, with matching platform package; `next` and `latest` pointed there in the live registry check.
- The CLI uses the Cline-derived execution engine, Groq onboarding and isolated `~/.shri` state. Custom multi-agent orchestration remains simulated/deferred.
- First publication, registry integrity, installed E2E and live file/tool evidence are recorded in the plan's historical Progress Log. Do not restart release Tasks 0-7.
- The owner chose to extend the existing `PLAN.md`: current repair sequence is Tasks 8-12. Application implementation has not started.

## Diagnosis and verification limits
- Recorded bug: later TUI messages fail because Groq rejects assistant `reasoning_content`.
- Source tracing found `shouldIncludeReasoningHistory` excludes only Cerebras; installed adapter `@ai-sdk/openai-compatible@3.0.37` serializes Groq history reasoning into that field.
- In-memory actual-adapter reproduction: first request accepted; second request rejected by a strict synthetic fixture. No live key or saved settings were used.
- Separate model issues: Groq picker uses catalog choices rather than its authenticated `/models` path; missing reasoning metadata can permit incompatible effort settings.
- No fresh live Groq/TUI reproduction or fixed-build evidence exists for this repair. Documentation/link/history-preservation checks passed.
- Broad inherited CLI suite previously failed/hung in doctor, kanban, plugin and connector areas; do not claim a full-suite pass. Earlier prompt/path and detached-hub fixes have their own recorded evidence.

## Constraints and pending external proof
- Execute sequentially, self-review, no subagents; preserve unrelated work and append real verification to the plan.
- Verify workspace owner `SSN-INSPIRON-35\Dell` before writes; follow SDK AGENTS.md files and existing provider-routing conventions.
- Keep keys out of fixtures, logs, builds and CI. Use isolated config; do not change the active user's saved model or credentials.
- No blocker to starting Task 8. Live key use and publishing retain the plan's authorization boundaries; this save-check does not perform either.
- Trusted publishing is reportedly configured but remains unproved until a successful real publish. Next unused repair version is expected to be `0.1.0-next.2`; check before release.
- Linux/macOS, real orchestration, rate-limit UX, `-m` persistence and wider integrations remain later work. Checkout edits do not update the global executable.
- For future remote operations use this repo's command-scoped GitHub CLI HTTPS helper; default SSH was recorded as authenticating to a different account.

## References
- [Live plan](PLAN.md): detailed Tasks 8-12, tests, gates and failure handling.
- [Diagnosis](RESEARCH/chat-model-errors.md): request trace, controlled reproduction and evidence limits.
- [Roadmap](CONTEXT/ROADMAP.md): proposed future features/customization, not current execution scope.
- [Release gates](RELEASE.md); [verbatim older status](WORK/archive.md); [prior work](WORK/2026-09-22/WORK.md).

## Next up (start here)
1. Start **Task 8**: add failing gateway/actual-request regressions, repair Groq outgoing history without deleting stored reasoning, and verify tool/signature preservation. Continue Tasks 9-12 in order after each gate; never restart Tasks 0-7.
