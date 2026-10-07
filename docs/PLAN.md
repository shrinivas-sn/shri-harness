# PLAN — Groq conversation and model reliability

**Written 26/09/2026.** Initially planning only. Phase 1 was executed on owner request on 26/09/2026; see its checkpoint and Progress Log. Archive durable evidence before closing this plan.

**Goal:** Make the Windows preview support reliable multi-turn Groq conversations, saved-session resume, and model switching.
**Why:** The published preview has the failures documented in [the diagnosis](RESEARCH/chat-model-errors.md). The owner requested a proper plan and explicitly said not to execute it.
**What this changes:** Future execution touches SDK history/routing, CLI model discovery/selection, installed tests, CI, and release documentation. This session changes documentation only.
**Done means:** R10–R14 have source, actual-request, installed Windows, hosted, live-provider, and registry evidence for an identified repaired prerelease. Until external steps complete, report the exact local milestone and leave those gates pending.
**Out of scope:** Real orchestration, Linux/macOS releases, new providers, UI redesign, dependency upgrades, rate-limit UX, prompt optimization, global `-m` persistence policy, and other roadmap proposals.

## Read this first

1. Inspect checkout, branch, and changes. Do not pull, reset, stash, change branches, or create a workspace automatically. Reconcile drift through Plan issues.
2. Read `DOCS/STATUS.md`, this plan's rules, the current task, and the latest Progress Log entry. Read the diagnosis before Task 8. Before SDK edits, read `sdk/AGENTS.md` and `sdk/packages/llms/AGENTS.md`.
3. Do not restart Tasks 0–7. The old plan and its complete Progress Log are preserved [verbatim](WORK/2026-09-26/PLAN-before-restructure.md). That snapshot's links/resume instructions are historical and relative to its former `DOCS/PLAN.md` location.
4. Detect the environment with these commands; do not assume account, version, port, or installation location. Run from checkout root unless stated otherwise.

| Check | Command | Pass looks like |
|---|---|---|
| Checkout | `git rev-parse --show-toplevel`; `git branch --show-current`; `git status --short`; `git log -1 --oneline` | Intended checkout; existing work accounted for |
| Ownership | `Get-Acl -LiteralPath (git rev-parse --show-toplevel) \| Select-Object Owner` | Matches the user's required owner, `SSN-INSPIRON-35\Dell`; otherwise stop writes |
| Runtime | `node --version`; `bun --version` | Compatible with package manifests and pinned build workflow |
| Adapter | From `sdk/packages/llms`: `node -p "require('@ai-sdk/openai-compatible/package.json').version"` | Matches lockfile; inspect installed source if changed |
| Scripts | `Get-Content package.json`; `Get-Content apps/cli/package.json`; `Get-Content sdk/packages/llms/package.json` | Commands below still exist |
| Remote identity, only when needed | `git remote -v`; `gh repo view --json nameWithOwner`; `gh auth status` | Intended repository/account matches release metadata |

5. **Where** fields use search anchors. Missing anchors mean inspect the equivalent and log the adjustment. Use disposable configuration under the owned checkout and ephemeral loopback ports.

### Existing work disposition

| Previous item | Treatment |
|---|---|
| Tasks 0–4: rendering, identity, build, packaging | Completed evidence preserved; retain relevant regression checks |
| Task 5: installed Windows acceptance | Historical 8/8 and live tool evidence preserved; extend in Phase 4 |
| Tasks 6–7: initial CI/publication | next.1 publication remains recorded; trusted publishing remains unproved |
| Task 8 | Carried into Phase 1 |
| Task 9 | Carried into Phase 2; split into discovery and picker integration |
| Task 10 | Carried into Phase 3; explicitly cover visibility scope |
| Task 11 | Carried into Phase 4; split proof design from installed verification |
| Task 12 | Carried into Phase 5; split CI, live candidate, and delivery |
| Broad inherited suite failures | Remain limitations; investigate only repair-related regressions |
| Old Progress Log | Preserved verbatim; new execution log starts empty |

### Required outcomes

| ID | Outcome | Phase |
|---|---|---|
| R10 | Groq outgoing history omits unsupported reasoning; storage, text, tools, and other providers remain intact | 1 |
| R11 | Effective endpoint/key discovery, conservative capability filtering, honest errors, safe cancellation | 2 |
| R12 | Selected-model capabilities govern effort and response visibility, including after switching | 3 |
| R13 | Installed Windows TUI proves three turns, tools, resume, discovery failure, and model switches | 4 |
| R14 | Hosted checks exercise repairs; live and release claims identify the tested artifacts | 5 |

## Facts verified while planning

| Fact | Source | Checked on |
|---|---|---|
| Clean checkout before planning; latest commit `91b4253`; owner matches user rule | Actual Git and Get-Acl outputs | 26/09/2026 |
| next.1 publication/installation is recorded; repair unstarted | `DOCS/STATUS.md`, `Current state - 24/09/2026`; historical evidence, not a fresh registry check | 26/09/2026 |
| History policy excludes Cerebras only | `sdk/packages/llms/src/providers/ai-sdk.ts`, `shouldIncludeReasoningHistory` | 26/09/2026 |
| Groq uses generic OpenAI-compatible transport | `sdk/packages/llms/src/providers/builtins.ts`, `id: "groq"` | 26/09/2026 |
| Adapter locked/installed at 3.0.37; serializer emits reasoning_content | `bun.lock`; `sdk/packages/llms/node_modules/@ai-sdk/openai-compatible/package.json` and `src/chat/convert-to-openai-compatible-chat-messages.ts` | 26/09/2026 |
| Existing tests cover Cerebras filtering and Vertex signatures | `sdk/packages/llms/src/providers/gateway.test.ts`, `strips reasoning history` and `preserves Vertex thought signatures` | 26/09/2026 |
| Endpoint discovery is gated to openai-compatible and reads saved configuration | `apps/cli/src/tui/hooks/use-model-selector.tsx`, `usesModelIdInput` and `fetchOpenAiCompatibleModelIds` | 26/09/2026 |
| Config carries active key; inference overlays active key/URL/headers | `apps/cli/src/main.ts`, `const config: Config`; `sdk/packages/core/src/services/llms/handler-factory.ts`, `normalizedProviderConfig` | 26/09/2026 |
| Missing reasoning metadata currently permits generic effort | `sdk/packages/llms/src/providers/routing/reasoning-options.ts`, `options === undefined` | 26/09/2026 |
| Visibility rule describes GPT-OSS but applies to all Groq disabled intent | `sdk/packages/llms/src/providers/routing/provider-option-rules.ts`, `provider.groq.reasoning-visibility` | 26/09/2026 |
| Picker changes modelId before final reasoning dialog completes | `apps/cli/src/tui/hooks/use-model-selector.tsx`, `config.modelId = selectedKey` | 26/09/2026 |
| GPT-OSS supports low/medium/high; visibility uses include_reasoning, not reasoning_format | [Official Groq reasoning reference](https://console.groq.com/docs/reasoning); recheck before implementation | 26/09/2026 |
| Authenticated GET /models is documented | [Official Groq models reference](https://console.groq.com/docs/models); coding capability policy is a separate decision | 26/09/2026 |
| Render smoke currently sends one prompt; model smoke uses catalog fixture | `apps/cli/script/smoke-installed-render-pty.mjs`, `session.type`; `smoke-installed-model-pty.mjs`, `catalogServer` | 26/09/2026 |
| CI omits focused SDK routing tests | `.github/workflows/ci.yml`, `Test Windows preview source surface` | 26/09/2026 |
| Publish dispatch rebuilds/verifies before publishing its own artifacts | `.github/workflows/release.yml`, `verify` and `publish` | 26/09/2026 |
| Runtime detected as Node 22.15.0/Bun 1.3.14; runners/scripts exist | Detection outputs and root/CLI/LLM manifests | 26/09/2026 |

No application tests, builds, live prompts, package installs, or registry queries ran during planning. The earlier synthetic reproduction remains historical evidence in the diagnosis.

## Rules for every task

- Execution starts only on the owner's request. This plan grants no implementation, commit, remote, credential, publication, or global-install authorization by itself.
- Execute sequentially and self-review; no subagents. Preserve unrelated work.
- For behavior changes, write/run the failing regression first, then implement and record green output. A broken fixture is not proof of the product defect.
- Preserve stored transcripts, incoming reasoning, tool IDs/results, and unrelated providers' signed history.
- Provider policy belongs in typed routing metadata; model facts in existing fact helpers; wire encoding in named routing rules. No parallel registry or broad JSON scrubber.
- Use synthetic secrets, isolated config, loopback endpoints, and task-owned processes. Never read active saved keys/history into fixtures or change the user's default model.
- Existing assertions are read-only except each task's explicit may-change list.
- SDK commands run from `sdk/`; CLI unit commands from root; native/packaging commands from `apps/cli`.
- Preserve direct-publish guards, Windows-only support, credential exclusion, lifecycle-disabled installs, and no-detached-hub checks.
- Proposed commit messages below apply only if commits are authorized in execution. Otherwise record `not committed — authorization pending` and continue local work. Never stage unrelated files.
- Checkpoints record requirement IDs, real commands/counts, limitations, commit status, and exact next task in STATUS and Progress Log.

## Failure handling

| Situation | Do this |
|---|---|
| Wrong workspace owner | Stop writes and report; never change ACLs or recreate Git |
| Missing compiled SDK exports | Run existing root `bun run build:sdk` during execution, then rerun identical test; record setup correction |
| Missing dependencies | Confirm runtime/lockfile and use frozen installation during execution; no speculative upgrades |
| Live 429 | Record separately from serialization rejection; honor provider retry guidance within bounded acceptance; leave uncompleted live rows unproven |
| PTY startup/cleanup failure | Capture phase timing and task-owned PID lineage; apply Task 11.1's method; no retry-only fix or process sweep |
| Unrelated inherited failure | Record actual scope and continue independent focused work; never claim broad pass |
| Discovery failure | Return typed error and retain usable prompt; no silent production fallback |
| Partial publish | Stop dependent publication, inspect both versions/integrities, and follow RELEASE.md new-version recovery; no overwrite/unpublish |
| Anything else fails | Diagnose/retry at most three times; preserve work, log output, continue only independent tasks; retry at phase end only with new evidence |
| Plan differs from reality | Apply Plan issues; do not silently rewrite or blindly execute |
| Owner-only action | Record missing input; continue independent work; reuse applicable authorization already given |

## Phase 1 — Repair outgoing history

**Purpose:** Establish R10 at gateway and actual adapter boundaries.
**Starts when:** Owner requests execution and preflight passes.
**Re-check first:** Inspect installed serialization and routing metadata. If upstream behavior changed, preserve the regressions and log the narrower necessary fix.

### Task 8 — Filter Groq replay without changing stored history

**Execution notes (amended, see issues 1–2):** Use approved host execution for the prescribed commands; track pre-repair cross-provider failures separately from Groq red evidence.

**Goal:** Later Groq requests retain valid text/tools without unsupported reasoning replay.
**Why:** Prior reasoning becomes an invalid assistant field on later requests.
**Where:** `sdk/packages/shared/src/llms/gateway.ts` (search text: `GatewayProviderRouting`); `sdk/packages/llms/src/providers/builtins.ts` (`id: "groq"`); `ai-sdk.ts` in that providers directory (`shouldIncludeReasoningHistory`, `emptiedByDroppedReasoning`); `gateway.test.ts` (`strips reasoning history`); `vendors/openai-compatible.test.ts` and `vendors/openai-compatible.ts` (`createOpenAICompatible`).
**Do:**
- [x] Add gateway regressions for both recorded GPT-OSS IDs: text plus reasoning, reasoning-only assistant, reasoning plus tool call/result, and saved-history-shaped input.
- [x] Capture actual serialized bodies with the installed adapter and synthetic fetch. First reply emits reasoning; the strict fixture rejects assistant reasoning_content. Follow-up must preserve text, tool IDs, ordering, and input-history equality to a pre-call clone.
- [x] Add optional `reasoningHistory: "omit"` to GatewayProviderRouting; set it in Groq builtin metadata and consume it alongside the existing Cerebras exclusion. Absent metadata preserves existing behavior.
- [x] Reuse empty-message handling: omit only assistant messages emptied by dropped reasoning. Preserve incoming reasoning events and all stored history.
- [x] Retain Cerebras aliases and signed-history regressions; test unrelated generic compatible providers retain existing behavior. Arbitrary custom aliases are outside this builtin Groq repair.
**Test first:** A real-adapter follow-up currently emits reasoning_content; the absence assertion must fail before production changes. Tool/nonmutation assertions exercise the same request path.
**Verify:** From `sdk/`: `bun -F @cline/llms test src/providers/gateway.test.ts src/providers/vendors/openai-compatible.test.ts`; `bun -F @cline/llms typecheck`; `bun -F @cline/shared typecheck` → exit 0, new cases executed and retained cross-provider cases pass.
**Verification amendment (issue 2, 26/09/2026):** The unchanged test invocation hit existing 5-second timeouts. The same two-file suite passed 182/182 with `--maxWorkers 1 --testTimeout 120000`; both prescribed typechecks passed. This execution-only override does not change assertions, runner configuration, or the recorded failure of the original invocation.

**Don't touch:** Storage, credentials, tool execution, versions, orchestration. May-change existing assertions: none; extend fixtures/add cases only.
**If it fails:** Trace gateway conversion versus wire serialization separately. Repair lost metadata propagation narrowly if needed and log affected paths; do not patch node_modules or delete stored reasoning.
**Commit:** `fix(llms): normalize Groq reasoning history for follow-up requests`

### Checkpoint — Phase 1

- [x] Full verification: Task 8 commands pass with actual-body red/green R10 evidence.
- [x] Commit recorded, or explicit uncommitted reason.
- [x] Status updated: source/wire repair proved; installed/live pending; next Task 9.1.
- [x] Progress Log records commands, counts, limitations, and issues.

A new session may start here.

## Phase 2 — Discover and select usable models

**Purpose:** Establish R11 using effective configuration and explicit failure states.
**Starts when:** Phase 1 checkpoint is recorded.
**Re-check first:** Compare active Config fields and inference merge order in handler-factory.ts. If endpoint/headers are not exposed to the hook, pass resolved fields from its existing caller; do not invent a second settings-precedence system.

### Task 9.1 — Implement bounded discovery and pure reconciliation

**Goal:** Return endpoint model IDs and coding eligibility without credential side effects.
**Why:** Catalog membership and endpoint membership are different evidence.
**Where:** New `apps/cli/src/utils/groq-model-discovery.ts` and `groq-model-discovery.test.ts` (new search text: `discoverGroqModels`); `apps/cli/src/utils/chat-models.ts` (`filterChatModels`); `apps/cli/src/utils/types.ts` (`Config`); reference `sdk/packages/core/src/services/llms/handler-factory.ts` (`normalizedProviderConfig`) and `provider-defaults.ts` in that directory (`resolveProviderConfig`).
**Do:**
- [x] Define discoverGroqModels input: resolved baseUrl, apiKey, headers, optional signal, and injected fetch. No settings reads/writes. Result: `{ status: "ok", ids: string[] }` or `{ status: "error", kind: "auth" | "timeout" | "network" | "response" | "cancelled", message: string }`.
- [x] GET normalized base URL plus /models with a 5,000 ms deadline covering body parsing and caller cancellation. Reject redirects; no retries or fallback endpoint.
- [x] Preserve explicit Authorization case-insensitively, otherwise use effective key. Validate data array and nonblank string IDs; deduplicate in endpoint order. Empty array is success; malformed entries/schema are response errors.
- [x] Classify 401/403 as auth, deadline as timeout, user abort as cancelled, 429/5xx/malformed responses as response, and transport failures as network. Errors use fixed safe messages, never raw body, headers, key, or credential-bearing URL.
- [x] Add pure reconcileGroqModels in the same module: intersect successful IDs with catalog; exclude known non-chat, audio/moderation-only, or explicitly tool-incapable entries. Missing capability evidence remains unverified/manual-only. Do not infer support from names or token limits.
- [x] Keep current selection separate from discovered options; failure never masquerades as empty success.
**Test first:** Effective key differs from saved key and custom endpoint is selected → fetch uses only effective fields; no secret appears in errors. Cover empty/duplicate/malformed, cancellation/deadline, auth/429/5xx, redirects, and known/unknown capability cases.
**Verify:** From root: `bun -F @cline/cli test:unit src/utils/groq-model-discovery.test.ts src/utils/chat-models.test.ts`; `bun -F @cline/cli typecheck` → exit 0 with negative/failure cases executed.
**Don't touch:** Saved settings, non-Groq discovery, generated model catalog, global persistence. May-change existing assertions: none in shared chat filtering.
**If it fails:** Fix the pure boundary first; compare configuration to inference. Missing metadata remains unverified rather than widening eligibility to satisfy a fixture.
**Commit:** `feat(cli): add bounded Groq model discovery`

### Task 9.2 — Integrate discovery and transactional selection

**Execution notes (amended, see issues 3–4):** Hook wiring is proved through an extracted controller plus the native renderer, because Vitest cannot load the picker `.tsx`; restoring after a failed apply covers in-memory state only.

**Goal:** Inspect/select/cancel models without partial configuration changes.
**Why:** Groq currently skips discovery and modelId changes before reasoning selection finishes.
**Where:** `apps/cli/src/tui/hooks/use-model-selector.tsx` (search text: `refreshProviderContext`, `config.modelId = selectedKey`, `onModelChange`); `apps/cli/src/tui/components/model-selector/model-selector.tsx` (`ModelOption`, `ModelSelectorContent`, `ThinkingLevelContent`); its `model-selector.render.test.tsx`; new `apps/cli/src/tui/hooks/groq-model-selection.test.ts` (new anchor: `Groq model selection`).
**Do:**
- [x] Feed discovery the same effective key/URL/headers as inference, using active overrides and matching provider config/defaults; never replace temporary credentials with stored ones. Test the hook-to-helper wiring.
- [x] Successful discovery shows reconciled eligible choices. Unverified IDs use the existing manual-ID path with an explicit capability warning. Empty success stays empty, with manual entry; no stale verified choices.
- [x] Failure preserves current selection and labels cached choices `Availability not verified`. Keep search, Escape, reopen, provider change, manual IDs, and prompt focus usable.
- [x] Stage candidate model/reasoning locally until dialogs succeed. Cancel restores original model/effort; failed apply restores in-memory state and reports failure. Use existing successful onModelChange persistence path without changing key/endpoint.
- [x] Abort/ignore stale discovery after close/provider change; late results cannot overwrite current options.
- [x] Extend native renderer coverage for status/warnings/sparse metadata, keeping the finite-positive token guard. Add hook/controller tests for config wiring and cancellation, not only pure helpers.
**Test first:** Catalog-only model excluded; failure preserves selection; Escape after entering reasoning dialog preserves original model/effort; late old-provider response ignored.
**Verify:** From root: `bun -F @cline/cli test:unit src/utils/groq-model-discovery.test.ts src/tui/hooks/groq-model-selection.test.ts` and CLI typecheck. From `apps/cli`: `bun test ./src/tui/components/model-selector/model-selector.render.test.tsx` → exit 0 including actual renderer and wiring/cancel cases.
**Don't touch:** Visual redesign, auth onboarding, unrelated provider behavior. May-change existing assertions: only Groq catalog-as-available expectations; retain token guards, transcription exclusion, and cancellation invariants.
**If it fails:** Extract a small state controller consumed by the hook if needed, while retaining wiring proof. Reuse existing dialogs rather than adding another picker.
**Commit:** `fix(cli): use effective Groq discovery in model selection`

### Checkpoint — Phase 2

- [x] Full verification: Phase 2 unit, typecheck, native renderer commands pass together.
- [x] Task commits recorded, or explicit uncommitted reasons.
- [x] Status updated: R11 source/picker proved; installed pending; next Task 10.
- [x] Progress Log records red/green, decisions, and issues.

A new session may start here.

## Phase 3 — Align reasoning controls with the selected model

**Purpose:** Establish R12; distinguish effort, response visibility, and history replay.
**Starts when:** Phase 2 checkpoint is recorded.
**Re-check first:** Retrieve current official Groq reasoning documentation and inspect installed adapter/capability metadata. Changed public contracts require a Plan issue before wire expectations change.

### Task 10 — Normalize effort and scope response visibility

**Execution notes (amended, see issues 5–6):** The defect was wider than planned — Groq's portable path skipped catalog normalization for every model — so the policy is applied once at gateway stream entry. Safeguard 20B keeps catalog efforts pending live proof.

**Goal:** Every selected model receives only supported reasoning options.
**Why:** Missing metadata currently permits generic effort, while the GPT-OSS visibility rule applies too broadly.
**Where:** `sdk/packages/llms/src/providers/routing/reasoning-options.ts` (search text: `options === undefined`); `portable-reasoning.ts` (`resolvePortableReasoning`); `provider-option-rules.ts` (`provider.groq.reasoning-visibility`); `sdk/packages/llms/src/providers/model-facts.ts` (`getModelReasoningControls`); shared GatewayProviderRouting, Groq builtin, and Task 9.2 ThinkingLevelContent call sites. Tests: routing `reasoning-options.test.ts`, `provider-options.test.ts`, providers `ai-sdk-reasoning.test.ts` and `gateway.test.ts`.
**Do:**
- [x] Add optional routing policy `reasoningRequiresKnownControls?: boolean` for Groq. Resolve known model facts/catalog controls before applying it; unknown/non-reasoning Groq omits optional controls. Preserve unrelated providers' missing-metadata behavior.
- [x] Preserve GPT-OSS low/medium/high. Normalize legacy minimal to low and xhigh/max to high through the existing helper. Omit effort without explicit preference. Off omits unsupported none/reasoning_format and uses include_reasoning false only for verified GPT-OSS routes.
- [x] Narrow the visibility rule through existing typed model-fact helpers. Other families use their own freshly verified controls; absent proof means omit optional fields and label controls unavailable.
- [x] UI offers supported values only. Preserve and document existing normalization of recognized CLI effort input; never forward invalid values or introduce a duplicate setting.
- [x] Capture actual request bodies for both GPT-OSS sizes, non-reasoning and unknown models, and another verified reasoning family if present. Cover no preference, Off, low/medium/high, legacy xhigh, and reasoning → non-reasoning → reasoning switches.
- [x] Preserve incoming reasoning, stored history, Phase 1 filtering, and cross-provider option/signature regressions.
**Test first:** Unknown/non-reasoning Groq with old effort omits optional fields; Off on non-GPT-OSS does not get the GPT-OSS-only visibility field; GPT-OSS Off keeps existing behavior. Capture actual-body failures first.
**Verify:** From `sdk/`: `bun -F @cline/llms test src/providers/routing/reasoning-options.test.ts src/providers/routing/provider-options.test.ts src/providers/ai-sdk-reasoning.test.ts src/providers/gateway.test.ts src/providers/vendors/openai-compatible.test.ts`; LLM/shared typechecks. Rerun Task 9.2 CLI/native commands → exit 0 with supported/unsupported wire cases and retained providers passing.
**Don't touch:** Catalog generation, account limits, fallback selection, token optimization. May-change existing assertions: Groq optional-field expectations contradicted by verified contract only; retain GPT-OSS Off and non-Groq regressions.
**If it fails:** Trace normalized intent, named rule, and serialized body separately. Pause only a family needing a public policy decision; continue proved GPT-OSS and conservative unknown behavior.
**Commit:** `fix(llms): respect Groq model reasoning capabilities`

### Checkpoint — Phase 3

- [x] Full verification: Task 10 command set passes; R10–R12 remain intact.
- [x] Commit recorded, or explicit uncommitted reason.
- [x] Status updated: source repairs complete within tested scope; installed/live pending; next Task 11.1.
- [x] Progress Log includes official sources/date and actual outputs.

A new session may start here.

## Phase 4 — Prove installed Windows journeys

**Purpose:** Establish R13 through the compiled executable, npm shim, persisted synthetic history, and real PTY.
**Starts when:** Phases 1–3 checkpoints are recorded.
**Re-check first:** Inspect report fields, runner inclusion, PTY capability, process cleanup, and artifact identity. A source build/headless render is not installed-terminal proof.

### Task 11.1 — Specify missing installed evidence with test-plan

**Goal:** Bind every journey to an observable failure and completion condition.
**Why:** Single-turn tests missed the real defect; hosted PTY failures also need disciplined diagnosis.
**Where:** `apps/cli/script/smoke-installed-render-pty.mjs` (search text: `createServer`, `session.type`); `smoke-installed-model-pty.mjs` (`openModelPicker`); `smoke-installed.ts` (`model-pty`); `apps/cli/src/commands/installed-release.e2e.test.ts` (`describe`); new `DOCS/RESEARCH/groq-repair-test-matrix.md`.
**Do:**
- [x] Run the test-plan skill during execution; save its scoped surface map, failure questions, scenario matrix, and existing-test mapping at the new research path, not another live PLAN.
- [x] Map R10–R14 to observable assertions and evidence levels. Include failures, ordering/stale responses, interruption, restart, old history, temporary key precedence, cleanup, Windows paths, and partial publication where applicable.
- [x] Define fixture sequences, unique visible markers, bounded waits, task-owned processes, and cleanup. Distinguish old seeded history from newly written history.
- [x] Specify a calibrated invalid-request control and rejection of stale terminal text. Mark unrun rows unproven; avoid unrelated suite expansion.
**Test first:** n/a — documentation-only task defining tests before harness changes.
**Verify:** Manual: every R13 row names driver/assertion, timeout, cleanup owner, and forbidden substitute evidence; none is proven from inspection. `git diff --check` → no whitespace errors.
**Don't touch:** Application code, global install, live sessions. May-change existing assertions: none.
**If it fails:** Record missing driver capability and exact manual Windows steps/evidence; continue automatable cases without treating manual gaps as passes.
**Commit:** `docs(test): define installed Groq repair acceptance`

### Task 11.2 — Extend installed smoke and verify fresh artifacts

**Goal:** Demonstrate repairs through freshly generated and installed tarballs.
**Why:** Checkout edits do not prove or update a compiled installed executable.
**Where:** Task 11.1 harness/matrix files; `apps/cli/script/package-release.ts` (search text: `windows-x64`); `apps/cli/script/verify-release.ts` (`verification-report`).
**Do:**
- [x] Extend loopback fixture with in-memory bodies, synthetic reasoning, strict replay/option rejection, and separate /models/chat/catalog routes; no production fallback.
- [x] Drive three user turns with distinct markers; verify continuity and matching visible completion for every turn.
- [x] Exercise tool call/result pairing, restart/resume synthetic saved reasoning history, and another reply with stored content preserved. *(08/10: synthetic turns written into the stored `messages.json`, resumed with `--id`, stored history read back.)*
- [x] Switch through a second reasoning model and non-reasoning fixture via /model, send requests, and assert model IDs/options. Cover failure/empty/cancel/reopen, unverified manual entry, catalog-only exclusion, and temporary credentials. *(08/10: all covered, plus malformed and stalled `/models`. Provider away-and-back (GR-14) is not covered.)*
- [x] Add required smoke-report fields and E2E assertions so omitted journeys fail. Preserve old install, syntax-color, no-Bun, lifecycle-disabled, Unicode/space-path, daemon-isolation, Ctrl+C, and cleanup checks.
- [x] Calibrate rejection with a synthetic invalid body before relying on green. A disposable baseline binary run can additionally demonstrate the original failure; do not touch global installation.
- [x] Rebuild/package/verify/install using disposable state; record actual version/hashes/counts and matrix evidence, separate from live acceptance.
**Test first:** Invalid replay must be rejected by the fixture; absent later completions, broken tool pairs, and invalid switched options must fail new assertions before completing harness changes.
**Verify:** Root: `bun run build:sdk`. From `apps/cli`: `bun run build:platforms:single`; `bun run package:release --target windows-x64`; `bun run verify:release --target windows-x64`; `bun run test:e2e src/commands/installed-release.e2e.test.ts` → exit 0 with all new journeys, not just the historical 8/8 count.
**Don't touch:** Global npm prefix, real keys/settings, unrelated tests. May-change existing assertions: fixture availability expectations changed by R11 only; retain all previous installed guarantees.
**If it fails:** Follow the matrix diagnostics; distinguish harness/setup from product defects. Return product fixes to their owning tasks through Plan issues and rerun affected gates. Longer waits need measured timing evidence.
**Commit:** `test(cli): cover installed Groq conversations and model switches`

### Checkpoint — Phase 4

- [ ] Full verification: fresh SDK/native build, verified tarballs, installed E2E, affected typechecks, and diff check pass; R13 matrix updated.
- [ ] Task commits recorded, or explicit uncommitted reasons.
- [ ] Status updated with exact artifact identity and fixture limitations; next Task 12.1.
- [ ] Progress Log records hashes, outputs, cleanup, and unresolved evidence.

A new session may start here.

## Phase 5 — Verify and deliver the repaired preview

**Purpose:** Establish R14 while separating local repair, live acceptance, publication, and global update.
**Starts when:** Phase 4 checkpoint is recorded. Independent local CI/docs work may continue while owner-only external actions wait.
**Re-check first:** Read RELEASE.md/workflows, detect remote/account identity, and query both package versions/dist-tags during release preparation. Expected next.2 is not reserved.

### Task 12.1 — Add repair regressions to hosted gates

**Goal:** Hosted Windows checks run every repair boundary.
**Why:** Current CI omits focused SDK routing tests.
**Where:** `.github/workflows/ci.yml` (search text: `Test Windows preview source surface`, `Test clean installed tarballs`); `DOCS/RELEASE.md` (`Gates before publishing`); Phase 4 matrix.
**Do:**
- [ ] Add Task 8/10 focused SDK tests and shared/LLM typechecks with SDK working directory; include Task 9 CLI tests and explicit Bun renderer invocation from apps/cli.
- [ ] Preserve packaging, installed smoke, integrity, and synthetic-only credential boundaries.
- [ ] Update release gates for three turns, tools, resume, switches, and separate live acceptance. State that each publish dispatch produces its own identified artifacts.
- [ ] Once remote operations are authorized, push reviewed work and inspect the real hosted run. Use the recorded command-scoped GitHub HTTPS helper, not global auth changes or the known wrong-account SSH default.
**Test first:** n/a — workflow/docs wiring; behavior tests already have red/green evidence. Validate command paths against manifests.
**Verify:** Exact added commands pass locally; `git diff --check` passes. Manual: selected hosted run summary and `gh run view --log-failed` show SDK/CLI/native/installed steps executed successfully; otherwise hosted proof remains pending.
**Don't touch:** Publish permissions, secrets, unrelated broad-suite policy. May-change existing assertions: none.
**If it fails:** Diagnose actual hosted stage/environment; do not delete gates, silently skip SDK tests, or inject live credentials.
**Commit:** `ci: gate Groq repairs on wire and installed tests`

### Task 12.2 — Prepare and live-test an identified candidate

**Goal:** Prove real provider acceptance for a versioned installed candidate in isolated state.
**Why:** Synthetic fixture acceptance does not prove current account/provider behavior.
**Where:** `apps/cli/package.json` (search text: `version`); `DOCS/RELEASE.md` (`Gates before publishing`); new `DOCS/RESEARCH/groq-repair-release-evidence.md`; `.github/workflows/release.yml` (`publish`).
**Do:**
- [ ] Query both scoped package version lists; choose the lowest unused 0.1.0-next.N above existing releases. Update CLI release version/derived metadata only; never move existing tags.
- [ ] Rebuild and repeat Phase 4 at that version. Record commit, version, target, both hashes, and acceptance results.
- [ ] Obtain applicable scoped live-key input. Prefer owner-entered credentials in disposable config; saved-key reading requires explicit scope. Never put keys in commands, logs, CI, or chat.
- [ ] Live installed acceptance: three short contextual turns, harmless fixture-file tool interaction, saved-session resume, and switches between available supported reasoning/non-reasoning models. Record IDs/outcomes; unavailable cases remain explicit gaps.
- [ ] With authorized remote preparation, create the new exact version tag and run release.yml with publish=false. Verify downloaded artifacts, install them, and repeat live acceptance so evidence identifies the hosted candidate.
- [ ] Prepare a reviewable manifest: version, commit/tag, platform, local/hosted/fixture/live results, hashes, and limitations.
**Test first:** n/a — acceptance/release metadata task; any new product fix returns to its owning task and invalidates candidate evidence until rebuilt.
**Verify:** Phase 4 commands pass at new version; isolated live results and unchanged active settings recorded. Root: `node apps/cli/script/check-publish-inputs.mjs --report apps/cli/dist/npm/verification-report.json --version $repairVersion --target windows-x64`, with repairVersion read from candidate manifest and report/artifacts downloaded into the documented layout → exactly two intended tarballs. Hosted preflight/verify pass; publish skipped.
**Don't touch:** Active global install/default model/history, existing tags, latest, SDK versions. May-change existing assertions: none.
**If it fails:** Separate auth/rate limits from contract failures. Missing live access leaves only live proof pending; never substitute fixture evidence. Source changes require rebuilding candidate evidence.
**Commit:** `chore(release): prepare Groq reliability prerelease`

### Task 12.3 — Publish and verify registry delivery when authorized

**Goal:** Deliver the verified Windows repair and prove the installed registry version.
**Why:** A candidate and configured trusted publisher are not completed publication.
**Where:** `.github/workflows/release.yml` (search text: `Publish verified Windows package then wrapper`); `apps/cli/script/check-publish-inputs.mjs` (`version`); `DOCS/RELEASE.md`, release evidence, and `DOCS/STATUS.md`.
**Do:**
- [ ] Evaluate active-session publication authorization against the concrete candidate; request it only if absent. Deferred publication remains pending without blocking independent local work.
- [ ] Dispatch publish=true at the approved immutable version tag. Existing workflow rebuilds/verifies again: record this publishing run's hashes and compare rather than assuming dry-run byte equality.
- [ ] Confirm trusted publishing succeeds for platform then wrapper; compare each registry integrity with the publishing-run tarball. Compare before/after dist-tags; publish next only, with no intentional latest promotion.
- [ ] Install the explicit registry version into a fresh Windows prefix, lifecycle scripts disabled and no Bun on runtime PATH. Parameterize/reuse installed harness against that registry executable and prove version, multi-turn/tool/resume/switch journeys and cleanup; repeat scoped live acceptance. Local tarballs are not registry proof.
- [ ] Update the user's global install only if separately authorized. Verify Get-Command shri -All and shri --version identify the expected binary, preserving user settings.
- [ ] Record final evidence/limitations and archive this plan's durable decisions/issues/log before closing. Optional deferred global update is explicit and does not prevent verified registry-delivery completion.
**Test first:** n/a — delivery guarded by earlier gates; registry acceptance reuses established tests against the new artifact source.
**Verify:** Manual: both publish jobs succeed, registry integrity matches exact artifacts, next resolves expected version, registry-prefix fixture/live acceptance passes, and global-update status is explicit. Missing proof leaves its gate open.
**Don't touch:** Direct-publish guard, immutable published versions, latest, account/ACL settings, global install without scope. May-change existing assertions: none; harness parameterization retains all assertions.
**If it fails:** Follow RELEASE.md partial-publication recovery: inspect existing state/integrity, preserve publication, and prepare a new verified version. Never blindly rerun both publishes or unpublish. A defective delivered version needs a corrective prerelease; global rollback requires permission.
**Commit:** `docs(release): record Groq repair delivery evidence`

### Checkpoint — Phase 5

- [ ] Full verification: separate local, hosted, live, publishing integrity, and registry-installed evidence exists; optional global update labeled done/deferred.
- [ ] Task commits recorded, or explicit uncommitted reasons.
- [ ] Status names exact delivered version and remaining gates; no broad-suite or real-orchestration claim.
- [ ] Progress Log complete; durable evidence archived before closing the live plan.

A new session may resume a pending external step here.

## Plan issues

Append only. Before each task compare facts/anchors with reality. Local same-intent changes are logged and handled immediately. Changes affecting design, shared interfaces, data, security, money, or public behavior pause only that step and flag the owner decision while independent work continues. A fundamentally wrong goal stops the phase with a proposed correction. Mark amended task text `amended, see issue N`; never silently overwrite it. Surface every entry in STATUS and the session's final message.

| # | When | Task | Plan said | Reality (evidence) | Impact | Action taken | Owner decision |
|---|---|---|---|---|---|---|---|
| 1 | 26/09/2026 | 8 | Run focused Bun workspace commands from sdk/ | Sandbox launcher exits 1 with `Failed to start process`; installed Vitest starts normally and approved host execution starts the exact command | Execution environment only | Use approved host execution with SDK working directory; no installation or source workaround | None needed |
| 2 | 26/09/2026 | 8 | Focused gate retains cross-provider passes | Before production changes: 22 failed / 160 passed; 12 new Groq cases, 9 existing 5-second timeouts and one Vertex-signature assertion failure (`WORK/2026-09-26/task-8-red.log`) | Full gate requires re-verification; timeout failures are separate from Groq serialization | Preserve existing assertions; isolate new regressions, then rerun full gate after repair; record any unresolved failures | None needed for local diagnosis |
| 3 | 07/10/2026 | 9.2 | Test hook-to-helper wiring with Vitest `groq-model-selection.test.ts` | Importing `use-model-selector.tsx` under Vitest fails: `Cannot find module …react-reconciler\constants` from `@opentui/react` (probe run, then deleted) | Hook glue itself has no automated test; its logic does | Used the task's own fallback: extracted `groq-model-selection.ts` (discovery wiring, stale gate, staged pick, transactional apply), consumed by the hook and tested in Vitest; picker props tested in the Bun native renderer. Remaining hook glue verified by typecheck and review | None needed; Phase 4 installed PTY is the end-to-end proof |
| 4 | 07/10/2026 | 9.2 | Failed apply restores in-memory state | `applyInteractiveModelChange` saves model/reasoning to provider settings before `restartWithCurrentMessages`; if the restart throws, config is restored but the saved model may already be the new one | Saved default could differ from the running model after a rare restart failure | In-memory restore and picker notice implemented; persistence ordering unchanged (outside this task's files) | Owner: should a failed apply also roll back the saved model? |
| 5 | 07/10/2026 | 10 | Missing metadata permits generic effort; visibility rule too broad | Actual bodies before repair ([table](WORK/2026-10-07/task-10-bodies-before.txt)): every Groq model — including Llama and unknown IDs — got `reasoning_effort`, raw `xhigh`/`minimal` reached GPT-OSS, and Off sent `include_reasoning: false` everywhere. Cause: Groq is a portable-reasoning provider, so `resolvePortableReasoning` reads the raw request while `normalizeReasoningRequest` runs only on the provider-options path after portable intent is stripped | Wider than the plan's unknown-model case; same intent | Policy `reasoningRequiresKnownControls` applied once at `createAiSdkProvider` stream entry (gated by provider metadata, so other providers are unchanged); visibility rule narrowed via typed `include-reasoning` route | None needed |
| 6 | 07/10/2026 | 10 | Use freshly verified controls per family | Groq docs (07/10/2026) name GPT-OSS 20B/120B and Qwen 3.8 for `reasoning_effort`; the catalog also lists low/medium/high for `gpt-oss-safeguard-20b` | Possible 400 if Safeguard rejects effort | Kept catalog efforts for Safeguard (typed model facts); omitted `include_reasoning` for it (undocumented). Qwen 3.8 Off sends nothing (its Groq `default` returns no reasoning tokens); no new `none` wire value | Owner/live: confirm Safeguard effort in Task 12.2 live acceptance |
| 7 | 07/10/2026 | 11.2 | Model-switch failures are harness timing | Installed model PTY runs 6–11 ([logs](WORK/2026-10-07/)): run 6 passed every check; runs 7–11 intermittently found the prompt deaf after a dialog closed — after applying GPT OSS 120B High (runs 8–10, `send SWITCH1`) and after Esc from the 401-notice picker (runs 5, 7, 11). Keys stayed dropped through four retypes over 8 s, so it is not a short remount race. Likely cause (not yet proven): `@opentui-ui/dialog` 0.1.2 restores saved focus on a 1 ms timer while the prompt refocuses by remounting its textarea (`use-prompt-input-controller.ts` `refocusTextarea`), so a stale or destroyed renderable can end up focused | Product defect in inherited prompt focus, outside the Groq repair files; users can intermittently get a dead prompt after `/model`. Blocks a stable Task 11.2 model-PTY gate | Harness now reports the live screen first, labels each picker opening with its caller, and retypes on missing echo (`inputRetries`). Product code unchanged | Owner (07/10/2026): fix inside this plan — see Issue 7 resolution |

**Issue 2 follow-up, 26/09/2026:** The first post-repair exact test command returned 174 passed / 8 failed (182 total); every new case passed. Seven existing tests timed out, followed by a Vertex-signature assertion failure. Individual existing cases took 6–62 seconds against the runner's 5-second default. Diagnose using the same two files with `--maxWorkers 1 --testTimeout 120000`; this is an execution-only timeout/concurrency adjustment, with no assertion or shared-config edits. Keep the original command's failure explicit.

**Issue 2 resolution, 26/09/2026:** The bounded sequential run passed all 182 tests, including unchanged Cerebras aliases and Vertex signed-history assertions. Both typechecks passed. This supports a runner timing/overlap explanation for the earlier failures; the exact cause of slow initialization was not established. Accept the local Phase 1 checkpoint with this documented execution adjustment. The original 5-second invocation remains a recorded limitation; no test assertion, global runner setting, or unrelated provider code was changed.

**Issue 7 resolution, 07/10/2026:** An env-gated focus trace in a local build (removed before commit) showed the cause. `refocusTextarea` remounts the keyed prompt textarea, and the new one focuses itself while rendering. Then `@opentui-ui/dialog` 0.1.2's 1 ms focus-restore timer re-focused the old textarea, which React destroys only in the passive effects phase, leaving focus null. Tab still toggled Plan/Act, so keys reached the app. Fix: new `apps/cli/src/tui/hooks/use-focus-after-remount.ts` (passive `useEffect` focusing the live textarea after each remount), called from `use-prompt-input-controller.ts`. Red: [module missing](WORK/2026-10-07/task-11.2-focus-red-missing.log), [no-op stub](WORK/2026-10-07/task-11.2-focus-red.log), [layout-effect version fails the layout-time steal](WORK/2026-10-07/task-11.2-focus-red2.log). Green: [4/4](WORK/2026-10-07/task-11.2-focus-green.log), including calibration cases that reproduce the dead prompt without the hook. Installed model PTY: 1/5 passing with the layout-effect version (those logs were overwritten by later runs), then 5/5 with the passive one, and 5/5 again with strict single-attempt typing ([run 1](WORK/2026-10-07/task-11.2-model-fixed-run1.log)). Same intent as Task 11.2 (installed switches must work); no shared interface changed.

## Owner inputs

- Request implementation later; this request is planning only.
- Supply/authorize isolated live credentials before live calls. Reuse applicable prior authorization; reading active saved credentials remains an explicit scope.
- Authorize commits/remote operations according to the execution session; missing remote scope does not block local work.
- Approve concrete publication if not already authorized; separately decide global update.
- No additional input is needed to start local implementation once requested. Defaults below can be overridden before execution.

## Decisions

- Continue the existing unfinished repair in place, preserve the old file verbatim, and carry every open Task 8–12 outcome. Completed release work remains history.
- *(assumed)* Five sequential phases retain old task numbers and split large tasks into bounded commits.
- *(assumed)* Typed routing policy handles builtin Groq history/unknown controls; arbitrary custom aliases retain prior behavior.
- *(assumed)* Discovery has a five-second deadline and no automatic retry; listing is not proof of coding/tool compatibility.
- *(assumed)* Missing capabilities require explicit unverified manual choice; error/empty/cancel never changes current selection.
- *(assumed)* Selection commits after all dialogs succeed; legacy recognized effort uses existing normalization without a new persistence policy.
- *(assumed)* Preserve rebuild-on-publish workflow and separately identify its output; reusing dry-run artifacts would require another workflow change.
- Existing Windows-only scope, sequential execution, no-subagents rule, and credential/publication boundaries remain in force.

## Progress Log

Original planning-only record: [WORK/2026-09-26/WORK.md](WORK/2026-09-26/WORK.md). Append entries with Done, Verified, Surprises, Next, and Commit fields, real commands/results, and no rewritten history.

### 26/09/2026 — Task 8 implementation and red evidence

- **Done:** Ownership/preflight verified, previous planning edits preserved, 14 cases added, 12 Groq regressions observed red, and the three-file routing repair applied. Completed Tasks 0–7 were not restarted.
- **Verified:** Pre-repair full command: 22 failed / 160 passed. Isolated new cases: 12 failed / 2 passed / 168 skipped. Corrected new empty-turn fixture rerun before production edits: 2 failed / 163 skipped. First post-repair full command: 174 passed / 8 failed, including all 14 new cases passing. Exact commands and logs are in [TASK-8.md](WORK/2026-09-26/TASK-8.md).
- **Surprises:** Plan issues 1–2 cover sandbox process launch and slow existing test initialization. The new empty-turn fixture was corrected to the existing formatter sentinel before the repair; no existing assertions changed.
- **Next:** Finish LLM/shared typechecks and bounded diagnostic rerun, self-review, then record the Phase 1 checkpoint. Task 9.1 is outside this session.
- **Commit:** Not committed — authorization pending. Nothing staged, published, or installed globally; no live credentials used.

### 26/09/2026 — Phase 1 checkpoint (Task 8 / R10)

- **Done:** Builtin Groq omits outgoing reasoning through typed routing metadata. Stored/input reasoning, incoming reasoning events, text, tool relationships, generic-compatible replay, Cerebras aliases, and Vertex signed history retain their tested behavior. Four real-adapter journeys cover both GPT-OSS IDs, tools/text, and JSON-shaped resume through a fresh gateway. All Task 8 actions completed; self-review only, as requested.
- **Verified:** From `sdk/`, `bun -F @cline/llms test src/providers/gateway.test.ts src/providers/vendors/openai-compatible.test.ts --maxWorkers 1 --testTimeout 120000` exited 0: **182/182 passed**, 2 files, 118.13s. `bun -F @cline/llms typecheck` and `bun -F @cline/shared typecheck` each exited 0. `git diff --check` passed. Red evidence precedes every production edit; no existing test assertions were removed or changed. See [full evidence](WORK/2026-09-26/TASK-8.md).
- **Surprises:** Issues 1–2 were handled with approved host execution and a local timeout/concurrency override. The original 5-second command returned 174 passed / 8 failed after repair; that failure remains explicit. The generic compatible path emits an existing provider-options deprecation warning. No unrelated repair was attempted.
- **Limitations:** Source/gateway/wire fixtures only. Installed Windows TUI, real persisted-session disk acceptance, live Groq, hosted CI, and registry delivery remain pending. No broad inherited CLI/SDK-suite pass is claimed; no build/global update/publication/live credential use occurred. Arbitrary custom Groq aliases remain outside scope.
- **Next:** **Phase 2, Task 9.1 — Implement bounded discovery and pure reconciliation.** Stop here at the Phase 1 checkpoint; Task 9.1 was not started.
- **Commit:** **Not committed — authorization pending.** Nothing staged. Base remains `91b4253`; existing planning and unrelated work were preserved.

### 07/10/2026 — Phase 1 committed

- **Done:** Owner authorized committing Phase 1. Task 8 source, tests, and evidence logs committed as `8b16b5a`; planning/status docs committed separately.
- **Verified:** Before committing, from `sdk/`: `bun -F @cline/llms test src/providers/gateway.test.ts src/providers/vendors/openai-compatible.test.ts --maxWorkers 1 --testTimeout 120000` → 182/182 passed, 40.52s; `bun -F @cline/llms typecheck` and `bun -F @cline/shared typecheck` → exit 0. Owner check matched `SSN-INSPIRON-35\Dell`.
- **Surprises:** Disk folder is `DOCS/`, Git tracks `docs/`; staging with `core.ignorecase=true` kept the tracked `docs/` casing.
- **Next:** Phase 2, Task 9.1.
- **Commit:** `8b16b5a` (fix); docs commit follows.

### 07/10/2026 — Task 9.1 bounded discovery and reconciliation

- **Done:** Added `apps/cli/src/utils/groq-model-discovery.ts` with `discoverGroqModels` (resolved baseUrl/apiKey/headers/signal/injected fetch; one GET to `/models`; 5,000 ms deadline over request and body; `redirect: "manual"` plus 3xx/`redirected` rejection; no retries; typed `ok`/`error` result with fixed safe messages) and pure `reconcileGroqModels` (endpoint ∩ catalog; non-chat and populated-without-`tools` excluded; uncatalogued or capability-less IDs `unverified`; endpoint order). No settings reads/writes; no hook wiring (Task 9.2).
- **Verified:** Red first: `bun -F @cline/cli test:unit src/utils/groq-model-discovery.test.ts` → exit 1, module missing ([log](WORK/2026-10-07/task-9.1-red.log)). Green from root: `bun -F @cline/cli test:unit src/utils/groq-model-discovery.test.ts src/utils/chat-models.test.ts` → 37/37 (34 new, 3 existing unchanged); `bun -F @cline/cli typecheck` → exit 0; Biome check clean on both files; `git diff --check` clean. Mutation check: replacing the body deadline, payload validation and cancel-first classification with naive code failed 11 targeted tests ([log](WORK/2026-10-07/task-9.1-mutation.log)); original restored byte-identical.
- **Surprises:** Plan did not classify an unparsable base URL; it returns `network` without sending a request (same-intent detail, no plan issue). Added an optional `timeoutMs` input only so tests can bound the deadline; the default stays 5,000 ms and is tested with fake timers. Correction to the previous entry: modified tracked files only staged under the lowercase `docs/` path; new files staged correctly from `DOCS/`.
- **Next:** Task 9.2 — integrate discovery and transactional selection.
- **Commit:** `feat(cli): add bounded Groq model discovery` (hash in STATUS).

### 07/10/2026 — Task 9.2 and Phase 2 checkpoint (R11)

- **Done:** Task 9.1 committed as `4e107a2`. New `apps/cli/src/tui/hooks/groq-model-selection.ts`: `loadGroqModelChoices` (connection from the existing `resolveCompactionProviderConfig`, the runtime's own precedence: session key over stored key, stored endpoint/headers, builtin default URL), `selectGroqPickerModels`, `DiscoveryGate`, `pickModelSelection` (dialogs without config mutation; Escape in reasoning returns to the list), `applyModelSelection` (commit, restore on failure). `use-model-selector.tsx`: Groq picker shows reconciled eligible models; failure keeps catalog with an `Availability not verified: …` notice; empty listing shows only manual entry; generic path stages selection and commits after dialogs; apply failure reopens the picker with a notice. `ModelSelectorContent` gained optional `notice` and `customModelWarning` props. Cline, openai-compatible, and provider-change paths unchanged.
- **Verified:** Red: controller test → module missing ([log](WORK/2026-10-07/task-9.2-red.log)); render tests against the previous component → 2 new cases fail, 3 pass ([log](WORK/2026-10-07/task-9.2-render-red.log)). Pre-change defect by inspection: `config.modelId = selectedKey` ran before `ThinkingLevelContent`, and Escape there `continue`d without restoring. Green from root: `bun -F @cline/cli test:unit src/utils/groq-model-discovery.test.ts src/tui/hooks/groq-model-selection.test.ts` → 49/49; `bun -F @cline/cli typecheck` → exit 0. From `apps/cli`: `bun test ./src/tui/components/model-selector/model-selector.render.test.tsx` → 5/5 (existing token-guard and transcription cases unchanged). Biome: no new findings (3 existing a11y warnings in untouched rows). `git diff --check` clean.
- **Surprises:** Plan issues 3–4. The `Availability not verified` label is a notice line above the list rather than per-row text. Unverified IDs are counted in the notice and reachable through manual entry; they are not listed.
- **Limitations:** Hook glue has no automated test (issue 3). Installed PTY, live Groq `/models`, and the installed model smoke (its loopback fixture may lack `/models`, which now yields the notice path) are Phase 4.
- **Next:** Phase 3, Task 10 — normalize effort and scope response visibility.
- **Commit:** `fix(cli): use effective Groq discovery in model selection` (hash in STATUS).

### 07/10/2026 — Task 10 and Phase 3 checkpoint (R12)

- **Done:** Task 9.2 committed as `75db91c`. Re-check: fetched official https://console.groq.com/docs/reasoning.md and models.md (07/10/2026); brief saved at `E:\dev-recipes\_knowledge\cache\groq-reasoning-controls.md`. Shared: `GatewayProviderRouting.reasoningRequiresKnownControls` and reasoning format `include-reasoning`. New `routing/groq-reasoning.ts` `GROQ_ROUTING_METADATA` (history omit, known-controls policy, GPT-OSS 120B/20B visibility routes) used by the Groq builtin. `enforceKnownReasoningControls` in `reasoning-options.ts` (existing `getModelReasoningControls`/`normalizeReasoningEffort`), applied at `createAiSdkProvider` stream entry. `provider.groq.reasoning-visibility` now also requires the route. CLI: `ModelOption.reasoningEfforts` from catalog controls; `ThinkingLevelContent` offers Off plus supported levels (all levels when unknown); models with no effort levels skip the dialog.
- **Resulting Groq bodies:** GPT-OSS 120B/20B: low/medium/high kept, `xhigh`/`max`→`high`, `minimal`→`low`, bare enabled → omitted, Off → `include_reasoning: false`. Safeguard 20B and Qwen 3.8: same efforts, Off → nothing. Qwen 3.6, Llama, unknown/manual IDs: no reasoning fields. Generic `openai-compatible` unchanged (tested).
- **CLI effort input (documented, unchanged):** `resolveCliReasoning` accepts `low/medium/high/xhigh`; `none` or persisted disabled → Off; persisted enabled without effort → `medium`; unrecognized values dropped. The gateway policy then maps to each model's supported levels.
- **Verified:** Red: actual bodies before repair ([table](WORK/2026-10-07/task-10-bodies-before.txt)); new wire table 36 failed / 22 passed ([log](WORK/2026-10-07/task-10-red-wire.log)); CLI render 2 failed ([log](WORK/2026-10-07/task-10-cli-render-red.log)); controller 1 failed ([log](WORK/2026-10-07/task-10-cli-controller-red.log)). Green from `sdk/`: `bun -F @cline/llms test src/providers/routing/reasoning-options.test.ts src/providers/routing/provider-options.test.ts src/providers/ai-sdk-reasoning.test.ts src/providers/gateway.test.ts src/providers/vendors/openai-compatible.test.ts --maxWorkers 1 --testTimeout 120000` → 399/399 (R10 history cases included); LLM and shared typechecks exit 0. Task 9.2 commands rerun: 50/50 unit, CLI typecheck exit 0, 8/8 native renderer. Neighbor suites: 71/71 LLM (catalog-live, model-operations, transcription, builtins), 36/36 CLI (run-agent, groq-auth, shri-auth-integration). Biome: no new findings.
- **Existing assertions:** none changed. The existing "Groq GPT-OSS disabled reasoning" case gained `metadata: GROQ_ROUTING_METADATA` in its context fixture (same pattern as GLM/MiniMax cases); its expectations are unchanged.
- **Surprises:** Plan issues 5–6. A first draft of the no-effort controller test looped forever against the old code (heap OOM); fixed by bounding the mock before recording red.
- **Limitations:** Fixture/wire evidence only; live Groq acceptance (including Safeguard, issue 6) is Task 12.2. Arbitrary custom Groq aliases are outside scope.
- **Next:** Phase 4, Task 11.1 — specify installed evidence with the test-plan skill.
- **Commit:** `fix(llms): respect Groq model reasoning capabilities` (hash in STATUS).

### 07/10/2026 — Task 11.1 installed acceptance matrix

- **Done:** Task 10 committed as `ab3fa24`. Ran the test-plan skill (plan mode) with the shared method; wrote [groq-repair-test-matrix.md](RESEARCH/groq-repair-test-matrix.md): 8 surfaces, all eight failure questions answered per surface, 25 project-local rows (GR-01–GR-25) mapping R10–R14 to installed assertions, all `unproven`; existing installed tests mapped; fixture design (strict replay/option rejection, separate `/models`/chat/catalog routes, per-turn markers after prompt echo, bounded waits, task-owned cleanup, calibration GR-24, optional baseline GR-25).
- **Verified:** `node E:/dev-recipes/_knowledge/scripts/test-plan-check.js DOCS/RESEARCH/groq-repair-test-matrix.md` → valid, 25 rows, exit 0; `git diff --check` clean. Manual: each R13 row names its driver/assertion, wait bound (§5), cleanup owner (§5) and forbidden substitute evidence; none is marked proven.
- **Surprises:** Finding F1 — the existing installed model smoke never overrides Groq `baseUrl`, so since `75db91c` it calls the real `api.groq.com/.../models` with a synthetic key and its `missingMetadataRendered` expectation assumes catalog-only listing. To fix in Task 11.2 (allowed may-change). No harness or app code changed here.
- **Next:** Task 11.2 — extend installed smoke and verify fresh artifacts.
- **Commit:** `docs(test): define installed Groq repair acceptance`.

### 07/10/2026 — Task 11.2 checkpoint and Plan issue 7 fix

- **Done:** Installed model and conversation PTY journeys run against freshly built, packaged and verified `0.1.0-next.1` tarballs. Diagnosed and fixed Plan issue 7 (dead prompt after dialogs; see Issue 7 resolution). PTY typing is strict (type once, wait for the text; on failure a Tab probe tells focus loss from dead input). E2E asserts every model and conversation check.
- **Verified:** [final build](WORK/2026-10-07/task-11.2-final-build.log) exit 0 (wrapper sha256 `4659c4b3…c9168f`, windows-x64 sha256 `7045934a…ea60c9`); [installed E2E](WORK/2026-10-07/task-11.2-e2e.log) 9/9 in 306 s; model PTY 5/5 and conversation PTY 3/3 standalone; [TUI unit](WORK/2026-10-07/task-11.2-tui-unit.log) 342/342 (`--maxWorkers 1 --testTimeout 120000`); [render](WORK/2026-10-07/task-11.2-render.log) 12/12; [CLI typecheck](WORK/2026-10-07/task-11.2-cli-typecheck.log) exit 0; Biome clean on changed files; evidence logs contain no key-shaped strings. [Timings](WORK/2026-10-07/task-11.2-timing.txt): model 53 s, conversation 33 s, so the E2E limits are 150 s and 120 s.
- **Existing assertions:** the old model-picker E2E case is renamed and now asserts all 18 model checks (its seven old assertions are kept). The others are unchanged.
- **Matrix:** 12 rows proven (GR-01, 02, 04, 05, 08, 10, 15, 16, 17, 21, 22, 24). Open with written gaps: GR-03, 06 (legacy `xhigh`), 07, 09, 11 (turn after 401), 12, 13 (manual ID turn), 14 (provider away/back), 18, 19, 20, 23; GR-25 optional.
- **Owner inputs:** owner put a Groq key in the git-ignored root `.env` (`GROQ_API_KEY`, presence and `gsk_` shape checked; value not read). Reserved for Task 12.2 live acceptance.
- **Next:** close the open Task 11.2 rows above, then the Phase 4 checkpoint.
- **Commits:** `fix(tui): refocus prompt after dialog focus restore`; `test(cli): cover installed Groq conversations and model switches` (hashes in STATUS).

### 08/10/2026 — Task 11.2 gap rows

- **Done:** pushed `91b4253..3b9dc63` (owner authorized); hosted [CI run 37664552770](https://github.com/shrinivas-sn/shri-harness/actions/runs/37664552770) passed, including the installed E2E. Model PTY gained a turn after the 401, malformed and stalled `/models`, a manual unverified ID used for a turn, and a raw terminal key scan. Conversation PTY gained one 503 on turn 2, a saved legacy `xhigh`, synthetic turns seeded into the stored `messages.json` before `--id`, stored-history read-back, store and raw log key scans, and Ctrl+C mid-stream with descendant-PID cleanup. The outer smoke fingerprints the real global `shri` before and after.
- **Verified:** [installed E2E](WORK/2026-10-07/task-11.2-gaps-e2e.log) 9/9 (285 s); [model case rerun](WORK/2026-10-07/task-11.2-gaps-e2e-model.log) after its last added check; standalone model and conversation runs exit 0; Biome clean. Probe code used to read the store format was removed.
- **Matrix:** 22 of 25 proven. Open: GR-14 (provider away and back: needs a second configured provider), GR-19 (requests to non-loopback hosts are not observable by this harness), GR-25 (optional baseline).
- **Surprises:** none in product behaviour; long notices wrap in dialogs, so waits match short fragments.
- **Next:** owner decision on GR-14/GR-19, then the Phase 4 checkpoint.
- **Commit:** `test(cli): cover remaining installed Groq repair journeys`.
