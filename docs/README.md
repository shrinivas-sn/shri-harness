<!-- docs-structure: v1 -->
# DOCS index

The Windows preview publication gates and operator steps are in [RELEASE.md](RELEASE.md).

Current reliability investigation: [chat and model-selection diagnosis](RESEARCH/chat-model-errors.md).
Proposed future features and customization: [product roadmap](CONTEXT/ROADMAP.md).
The roadmap is a proposal inventory, not a second live execution plan.

Current execution handoff: [Groq repair plan](PLAN.md), restructured 26/09/2026; Phases 1–3 committed, 0.1.0-next.2 published and verified on npm 08/10; next: trusted-publishing fix before the next release.

Earlier verbose status is preserved in [WORK/archive.md](WORK/archive.md); use [STATUS.md](STATUS.md) for current resume instructions.

One row per `WORK/<date>/` folder. Keep this updated in place — don't let it drift from what's actually in `WORK/`. Add a row the same session a new day-folder is created.

Dates in this table are written **DD/MM/YYYY** (user is India-based). This is display text only — the `WORK/<date>/` folder name underneath stays YYYY-MM-DD, since that's the only format that sorts correctly on disk and in `git log`.

| Date | Summary | Status | Load-bearing | Touches | Continues |
|---|---|---|---|---|---|
| 21/09/2026 | Extracted lean harness and built Shri orchestration scaffolding; completion claim corrected on 22/09 | done | yes | `apps/cli/src/shri/**`, `DOCS/**` | — |
| 22/09/2026 | Groq onboarding/live inference, npm preview plan, `/model` investigation, final static review and Terra handoff | done | yes | `apps/cli/**`, `package.json`, `DOCS/**` | `WORK/2026-09-21/WORK.md` |
| 26/09/2026 | Restructured Groq repair plan; preserved prior plan verbatim; then implemented Phase 1 / Task 8 (committed `8b16b5a` on 07/10) | active | yes | `sdk/packages/llms/**`, `sdk/packages/shared/**`, `apps/cli/**`, `.github/workflows/**`, `DOCS/**` | `WORK/2026-09-22/WORK.md` |
| 07/10/2026 | Committed Phase 1; Phases 2–3 done; Task 11.1 matrix done; Plan issue 7 prompt-focus fix; Task 11.2 (22/25 matrix rows proven, pushed 08/10) | active | yes | `apps/cli/src/utils/**`, `apps/cli/src/tui/hooks/**`, `apps/cli/src/tui/components/model-selector/**`, `apps/cli/script/smoke-installed*`, `apps/cli/src/commands/installed-release.e2e.test.ts`, `sdk/packages/llms/src/providers/**`, `sdk/packages/shared/src/llms/**`, `DOCS/**` | `WORK/2026-09-26/WORK.md` |
| 08/10/2026 | Plan issue 4 fix; Task 12.1 hosted gates; next.2 built, live-accepted, tagged and published (manual npm publish) | active | yes | `apps/cli/src/runtime/run-interactive*`, `.github/workflows/ci.yml`, `DOCS/**` | `WORK/2026-10-07/WORK.md` |

**Status** — `active` (in progress), `done` (finished, not touched again), `superseded` (a later entry replaced this approach), `abandoned` (started, dropped, note why in the WORK.md itself).

**Load-bearing** — `yes` if this session's decisions still constrain current architecture/behavior, even if old. `no` once it's fully superseded or irrelevant to anything still standing.

**Touches** — rough file paths or feature areas, used by `/recap` to decide whether an old-but-load-bearing entry is relevant to what you're doing right now.

**Continues** — if this session picks up a multi-day work item, point at the earlier date so recap follows the thread instead of treating same-topic sessions as unrelated.
