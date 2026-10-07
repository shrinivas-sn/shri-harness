# Task 8 — Groq outgoing-history repair

Execution: 26/09/2026, sequential, self-review only. Scope stops at the Phase 1 checkpoint; Tasks 0–7 are historical.

## Preflight and sources

- Checkout `E:/shri-harness`, branch `main`, base commit `91b4253`.
- Workspace owner verified before writes: `SSN-INSPIRON-35\Dell`.
- Node `22.15.0`, Bun `1.3.14`; installed adapter and `bun.lock` both identify `@ai-sdk/openai-compatible@3.0.37`.
- Existing uncommitted `PLAN.md`, `STATUS.md`, `README.md`, and dated planning records were retained. Only the plan/status receive execution updates; the planning snapshot and WORK.md remain untouched.
- Read the plan/preflight, STATUS, diagnosis, SDK AGENTS files, execution guide, and relevant SDK/adapter source.
- Installed source `node_modules/@ai-sdk/openai-compatible/src/chat/convert-to-openai-compatible-chat-messages.ts` emits `reasoning_content` for assistant reasoning; the response parser accepts incoming `reasoning` or `reasoning_content`.
- [Groq reasoning docs](https://console.groq.com/docs/reasoning), rechecked 26/09/2026, document the two GPT-OSS IDs and incoming `message.reasoning`. This supports the response fixture, not a claim of fresh live acceptance. Installed adapter evidence confirms the existing diagnosis and does not change the planned repair.

## Implementation and regression coverage

Optional `GatewayProviderRouting.reasoningHistory: "omit"` is set by builtin Groq and consumed by the existing outgoing-history predicate alongside the Cerebras exclusion. No serializer, stored transcript, tool executor, version, installation, or dependency changes.

New cases: eight gateway cases (four per GPT-OSS ID), four actual-adapter journeys (text/tool variants for both IDs), and two generic-compatible preservation cases. The wire journeys use synthetic fetch only, emit incoming reasoning, check the literal serialized history, preserve tool IDs/arguments/results/order, and resume JSON-shaped saved history through a fresh gateway. Input transcripts and converted messages equal pre-call clones. This is not an on-disk installed-session test.

## Verification record

All SDK commands run from `sdk/`. The Bun workspace launcher failed in the sandbox before tests started; approved host execution was used thereafter (Plan issue 1).

| Command/run | Actual result | Evidence |
|---|---|---|
| `bun -F @cline/llms test src/providers/gateway.test.ts src/providers/vendors/openai-compatible.test.ts` before repair | Exit 1: 22 failed, 160 passed, 182 total; 12 Groq regressions plus 9 existing test timeouts and one Vertex-signature assertion failure | [Full red log](task-8-red.log) |
| Same command with `-t 'Groq\|retains reasoning for generic\|preserves serialized reasoning'` | Exit 1: 12 failed, 2 passed, 168 skipped; actual-body absence assertions fail and strict fixture rejects request 2 | [Focused red log](task-8-red-focused.log) |
| `bun -F @cline/llms test src/providers/gateway.test.ts -t 'omits reasoning-only assistant turns'` | Exit 1: 2 failed, 163 skipped, specifically for retained reasoning-only turns | [Corrected fixture red log](task-8-red-empty.log) |

The new empty-turn fixture initially expected an empty string. Inspection showed the existing shared formatter preserves that turn as `ERROR: EMPTY CONTENT`; the new expectation was corrected and rerun red before production edits. Existing test assertions were not changed.

Plan issue 2 records the initial full-run timeouts separately. Final verification, self-review, limitations, and checkpoint results are appended after completion.

## Final checkpoint

| Verification | Actual result | Evidence |
|---|---|---|
| Original two-file test command after repair | Exit 1: 174 passed, 8 existing failures (7 timeouts and Vertex assertion); all 14 new cases passed | [Original-limit run](task-8-green.log) |
| Same command with `--maxWorkers 1 --testTimeout 120000` | Exit 0: 182/182 passed, 2 files; 118.13s total (73.13s tests) | [Bounded verification](task-8-bounded-verification.log) |
| `bun -F @cline/llms typecheck` | Exit 0 | [LLM typecheck](task-8-llms-typecheck.log) |
| `bun -F @cline/shared typecheck` | Exit 0 | [Shared typecheck](task-8-shared-typecheck.log) |
| `git diff --check` | Exit 0 | Local final verification |

The longer timeout is a command-line verification adjustment for observed delays, not an assertion/configuration change. The original-limit failures remain documented. The bounded run also proves retained Cerebras exclusion/aliases and Vertex thought signatures. Timing/overlap is consistent with the evidence; the underlying initialization delay was not conclusively diagnosed. Generic-compatible tests emit the existing `openai-compatible` provider-options key deprecation warning; it is outside this repair.

Self-review checked the three-file production diff, builtin metadata propagation, default behavior for absent policy, unchanged Cerebras fallback, outgoing-only filtering, tool ordering/IDs, and immutable input comparisons. Test diffs contain additions only (no removed/changed existing assertions). No node_modules, serializer, storage, credential, version, or unrelated-provider edits.

Changed files in this task:

- `sdk/packages/shared/src/llms/gateway.ts`
- `sdk/packages/llms/src/providers/builtins.ts`
- `sdk/packages/llms/src/providers/ai-sdk.ts`
- `sdk/packages/llms/src/providers/gateway.test.ts`
- `sdk/packages/llms/src/providers/vendors/openai-compatible.test.ts`
- `DOCS/PLAN.md`, `DOCS/STATUS.md`, this record and seven task-specific logs

The pre-existing `DOCS/README.md`, historical planning snapshot, and planning WORK.md edits were not changed by this task.

Limitations: fixture/source proof only, not installed TUI, on-disk session acceptance, live provider, hosted CI or registry proof. No broad inherited CLI/SDK-suite pass, no arbitrary custom Groq-alias guarantee. No SDK/native rebuild or global installation change was needed or performed.

Commit: **not committed — authorization pending**; nothing staged, base `91b4253` unchanged. No remote, publication, or live credentials used. Phase 1 checkpoint recorded with issues 1–2; stopped here. Next task: **Phase 2, Task 9.1**.
