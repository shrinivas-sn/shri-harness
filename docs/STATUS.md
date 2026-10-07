# Project status

## Current state - 07/10/2026, Phase 2 checkpoint

- **Phase 1 committed:** fix `8b16b5a`, docs `efd82f7`. Bounded gate re-run first: 182/182, both typechecks exit 0.
- **Task 9.1 committed `4e107a2`:** bounded `discoverGroqModels` and pure `reconcileGroqModels`.
- **Task 9.2 / R11 source+picker done (`75db91c`):** `/model` on Groq lists only models the effective key's endpoint returns and the catalog proves tool-capable. Failure keeps the catalog with an `Availability not verified` notice; an empty list offers manual entry with a capability warning. Selection is staged until every dialog succeeds; failed apply restores the in-memory model and effort.
- **Verification:** 49/49 Vitest (discovery + controller), CLI typecheck exit 0, 5/5 Bun native renderer; red evidence recorded for both test files.
- **Plan issues 3–4:** Vitest cannot load the picker `.tsx`, so wiring is proved through an extracted controller (hook glue: typecheck/review only). **Owner decision open (issue 4):** should a failed apply also roll back the saved model? `applyInteractiveModelChange` saves before restarting.
- **Evidence:** [07/10/2026 work](WORK/2026-10-07/WORK.md), [PLAN Progress Log](PLAN.md#progress-log).
- **Limits:** installed TUI, live Groq `/models`, hosted CI, registry remain pending; installed model smoke may now take the notice path if its fixture lacks `/models` (Phase 4).
- **Next: Phase 3, Task 10 — normalize effort and scope response visibility.**

## Phase 1 checkpoint - 26/09/2026

- **Task 8 / R10 completed locally with the verification adjustment in Plan issue 2.** Builtin Groq now omits outgoing reasoning history while preserving input/stored reasoning, incoming events, text, and tool relationships. Both GPT-OSS IDs have gateway and real-adapter regression coverage.
- **Verification:** 182/182 focused tests passed with `--maxWorkers 1 --testTimeout 120000`; LLM and shared typechecks passed; diff check passed. The original 5-second invocation still recorded 8 existing failures after repair, so it is not claimed as passing.
- **Plan issues 1–2:** sandbox Bun launcher required approved host execution; measured existing-test delays required a bounded sequential verification run. That run retained all assertions, including Cerebras aliases and Vertex signed history. The root cause of slow initialization remains unproved.
- **Evidence:** [Task 8 record and logs](WORK/2026-09-26/TASK-8.md), [PLAN Progress Log](PLAN.md#progress-log). Fourteen new cases; 12 Groq cases were observed failing before the repair.
- **Limits:** source/wire fixtures only; installed TUI, persisted-session disk acceptance, live provider, hosted CI, and registry gates remain pending. Generic-compatible provider-options deprecation warning retained. No broad-suite pass claimed.
- **Commit:** `8b16b5a` on 07/10/2026 at the owner's request, after re-running the bounded gate (182/182 again, both typechecks exit 0). Ownership verified before writes, no subagents, previous planning/unrelated work preserved. No live credentials, publication, global install, version changes, or dependency updates.
- **Stopped at Phase 1. Next: Phase 2, Task 9.1.**

## Planning state before Task 8 - 26/09/2026

- Planning only: the owner requested a proper plan and explicitly said not to execute it. No application code, tests, builds, credentials, installations, or releases were changed/run.
- [PLAN.md](PLAN.md) now contains five sequential repair phases with full task cards, test-first requirements, checkpoints, failure handling, owner inputs, and a Plan issues log.
- The previous plan and full historical Progress Log are preserved byte-for-byte in [the planning snapshot](WORK/2026-09-26/PLAN-before-restructure.md). Completed Tasks 0–7 must not be restarted; all open Tasks 8–12 remain carried forward.
- The last recorded published Windows x64 preview is @shrinivas-sn/shri@0.1.0-next.1. Registry and global installation were not rechecked this session.
- At planning time, the main defect was later TUI requests replaying unsupported reasoning_content. The historical reproduction remains in [the diagnosis](RESEARCH/chat-model-errors.md); Task 8 now adds source/wire repair evidence, while fixed installed-build and live evidence remain pending.
- Planning also confirmed effective-configuration discovery gaps, missing-capability effort handling, a visibility rule broader than its GPT-OSS description, and model mutation before selection finishes.
- Custom multi-agent orchestration remains simulated/deferred. Linux/macOS, rate-limit UX, global -m persistence, and broader integrations remain outside this repair.

## Execution constraints and pending evidence

- Work sequentially, self-review, no subagents. Verify required workspace ownership before writes and follow SDK AGENTS.md files.
- Preserve stored reasoning, tool relationships, unrelated work, active credentials, and the user's saved model. Fixture tests use isolated synthetic state.
- Source changes do not update the global executable. Installed, live-provider, hosted, and registry evidence are separate gates.
- Broad inherited CLI suite failures/hangs remain recorded limitations; do not claim a full-suite pass.
- Trusted publishing is configured according to prior records but remains unproved. Select the next unused prerelease at execution time; next.2 is not reserved.
- Live credential use, remote operations, publication, and active global update retain their authorization boundaries. The plan itself authorizes none.
- Use the recorded command-scoped GitHub HTTPS helper for future remote work; default SSH was recorded as using another account.
- Task 8 reached the local checkpoint with Plan issues 1–2 documented above. Planning record: [26/09/2026](WORK/2026-09-26/WORK.md).

## Next up (start here)

On the next execution request, read PLAN.md's preflight/rules and latest Progress Log, then start **Phase 3, Task 10 — Normalize effort and scope response visibility** (re-check the official Groq reasoning docs first, per the phase's re-check rule). Do not restart Tasks 0–9.2. Surface open Plan issue 4 to the owner. Keep the Phase 1 default-timeout limitation and later installed/live gates explicit.
