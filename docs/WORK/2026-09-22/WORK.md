# Work Log: 2026-09-22

## Objective
Implement storage isolation to `~/.shri`, default provider configuration to Groq (`openai/gpt-oss-120b`), Option B interactive first-time auth setup with secure masked input, and verify live inference.

## Changes Made
1. **Shri Directory Isolation (`apps/cli/src/shri/auth/shri-dir.ts`):**
   - Implemented `resolveShriHomeDir()` (defaults to `~/.shri`, respects `SHRI_DIR`).
   - Implemented `initShriEnvironment()` (redirects SDK storage to `~/.shri`).
   - Unit tests: `apps/cli/src/shri/auth/shri-dir.test.ts` (3/3 passing).

2. **Groq Authentication & Interactive Setup (`apps/cli/src/shri/auth/groq-auth.ts`):**
   - Implemented `validateGroqKeyFormat()` (verifies non-empty, checks `gsk_` prefix).
   - Implemented `maskApiKey()` (masks key for safe display: `gsk_...3a9f`).
   - Implemented `resolveGroqApiKey()` (env priority over persisted settings).
   - Implemented `saveGroqApiKey()` (stores in `~/.shri/data/settings/providers.json`).
   - Implemented `promptHiddenInputInTerminal()` (masks input with `*` so raw keys never leak).
   - Implemented `ensureGroqApiKey()` (welcomes user, prompts interactively in TTY, fails cleanly in CI).
   - Unit tests: `apps/cli/src/shri/auth/groq-auth.test.ts` (12/12 passing).

3. **CLI Commands & Runtime Wiring:**
   - `apps/cli/src/commands/program.ts`: Default provider set to `groq`.
   - `apps/cli/src/commands/auth.ts`: Integrated Groq as primary provider and default for bare `--apikey`.
   - `apps/cli/src/main.ts`: Isolated storage to `~/.shri`, ensured Groq API key on startup, defaulted model to `openai/gpt-oss-120b`, caught 401 Unauthorized errors with helpful instructions.
   - Integration tests: `apps/cli/src/shri/auth/shri-auth-integration.test.ts` (2/2 passing).

4. **Verification:**
   - 11 test suites / 44 tests pass via `bun -F @cline/cli test:unit src/shri/`.
   - Tested non-TTY error behavior: exits cleanly with code 1 and actionable instructions.
   - Tested `shri auth -k <key>`: successfully created and populated `~/.shri/data/settings/providers.json`.

5. **Live Verification:**
   - User ran `bun run shri -i` in interactive terminal.
   - Successfully authenticated with saved Groq key.
   - Live stream completed with model `openai/gpt-oss-120b`, reasoning thinking trace, and $0.00 cost.

## Packaging analysis and plan revision — 22/09/2026

Done: Inspected the public npm manifests/READMEs for `@shrinivas-sn/verify-claims@0.2.0` and `@shrinivas-sn/adapter-ingestion@0.2.0`, plus verify-claims CI/release workflows. Reviewed the local launcher, publisher, build, auth, updater, native runtime and custom pipeline. User accepted releasing the working single-agent CLI first and explicitly authorized revising the existing plan, with no subagents. Preserved the old reference in `npm-packaging-reference-superseded.md` and rewrote `DOCS/PLAN.md` using the standard plan structure, sequential tasks and release gates.

Verified: `bun -F @cline/cli test:unit src/shri/` passed 11 test files / 44 tests, exit 0, duration 24.81s. `bun run build` from apps/cli exited 1: missing `vite/client`, `vite`, `@tailwindcss/vite` and `@vitejs/plugin-react-swc`. Installed Node v22.15.0 returned `ERR_UNKNOWN_BUILTIN_MODULE` for `node:ffi`. `Get-Acl E:\shri-harness` returned owner `SSN-INSPIRON-35\Dell`. Git was clean before documentation edits.

Surprises / correction: The 21/09 record's “complete Shri V1” wording overstated real orchestration: `src/shri/index.ts` creates a fixed plan and simulates default execution; `src/shri/bin.ts` claims a saved run without writing it. Actual interactive Groq inference is a separate working path. Upstream publisher/updater/postinstall still target Cline. The old plain Node package recommendation and guard-bypass instructions are superseded. Adapter's linked repository returned 404, so its actual workflow was not verified.

Next: Execute the revised plan's Task 1 sequentially, starting with identity/state-isolation tests. Preserve credentials locally, keep build/release jobs key-free, and test actual installed tarballs before publication review. No implementation or publication was performed during planning.

Commit: Not committed.

## `/model` crash investigation and save-check — 22/09/2026

Done: User reported `bun run shri` then `/model` crashes with `Text must be created inside of a text node`. Read-only tracing identified a leading cause: `ModelRow` directly renders `model.maxInputTokens && <text>...</text>`; two Groq transcription models have zero token limits, and the refresh/picker path does not use the existing `filterChatModels` helper. Added Task 0 ahead of the existing plan and extended installed-package acceptance checks. Updated the status resume point. No source fix or dependency change was made.

Verified: A read-only Bun import of `GENERATED_PROVIDER_MODELS.providers.groq` reported `whisper-large-v3-turbo` and `whisper-large-v3` with `operation: transcription`, `maxInputTokens: 0`, and the short-circuit expression's result `0`. Installed OpenTUI's reconciler throws the supplied error for text outside a text node. A native renderer probe returned no result and was terminated; a host process check found no surviving task-owned probe. Full command-path reproduction and regression red/green evidence remain pending.

Surprises: Existing loading-dialog tests verify show/close callbacks without rendering; the normal Vitest include pattern excludes `.test.tsx`, so real-renderer coverage needs its own explicit Bun command. The inspected POSIX interactive driver cannot count as Windows evidence when skipped or unavailable.

Next: Execute `DOCS/PLAN.md` Task 0 in `E:\shri-harness`: bounded reproduction, confirmed minimal fix, catalog eligibility and renderer regression, then Windows `/model` interaction. Keep no-subagent and key-exclusion constraints. Publication remains blocked by this crash and the existing build/packaging gates.

Commit: Prepared for scoped save-check; the final response records the actual verified commit hash. No remote push is authorized or performed.

Verified (checkpoint): Documentation whitespace checks passed. Active plan audit: 8 tasks, 55 pending steps, 0 completed steps; Task 0 precedes Task 1; status remains below 50 lines; archived reference matches the original Git version. A disposable Git fixture confirmed selected-only commit behavior preserves unrelated staged work, and was removed afterward. Runtime fix verification is still pending.

## Final static review and Terra handoff — 22/09/2026

Done: Reviewed the saved 21/09 and 22/09 execution records, archived V1 plan, superseded packaging reference, current plan and relevant source. User requested one final analysis, then explicitly requested this save-check and a prompt for GPT-5.6 Terra with high reasoning. Retained the existing live plan and task order; added the auth regressions below to Tasks 1 and 5, updated executor/status/index, and clarified that Task 0's source/Windows gate precedes Task 5's installed-package proof. No application code, tests, dependencies or build outputs changed.

Findings and source evidence (paths relative to repository root; line numbers describe the reviewed source):

- Earlier completion claims exceeded implementation. `apps/cli/src/shri/index.ts:54` builds a fixed one-task plan; `:130` fabricates a successful envelope; `:142` counts estimated tokens. `apps/cli/src/shri/bin.ts:19` claims Groq planning, `:34` auto-approves, and `:43` claims a saved record. `persistence/run-history.ts` only serializes/formats; the pipeline never writes a run record. `shri/e2e.test.ts:15` injects a mock executor, so the old plan's mock integration test did not establish real orchestration. These are deferred orchestration gaps, not reasons to discard the separate working chat CLI.
- `/model`: `apps/cli/src/tui/components/model-selector/model-selector.tsx:582` uses a numeric short-circuit child; `apps/cli/src/tui/hooks/use-model-selector.tsx:352` and `:359` build options without `filterChatModels`. This agrees with the earlier zero-token catalog evidence. This review did not reproduce the renderer exception. Execute Task 0's bounded real-renderer red/green regression and Windows interaction; do not assume the hypothesis is conclusively proven or change dependency versions as a first response.
- Auth recovery: `apps/cli/src/commands/auth.ts:425` routes bare Groq auth to `ensureGroqApiKey`; `apps/cli/src/shri/auth/groq-auth.ts:121` returns any existing key immediately. Consequently the `main.ts:1263` instruction to run `shri auth` cannot replace a saved invalid key interactively. Task 1 must distinguish explicit reconfiguration from startup reuse, preserve model/settings on cancellation, and prove replacement using synthetic credentials. `shri/auth/shri-auth-integration.test.ts:46` merely checks that a code is defined; it does not prove the interaction.
- Auth precedence: `apps/cli/src/main.ts:978-998` selects CLI/saved credentials before invoking the helper, bypassing the helper's environment-first resolution whenever a saved key exists. `src/shri/auth/groq-auth.ts:38` promises environment-before-saved behavior. `sdk/packages/core/src/auth/provider-auth-registry.ts:363` reads saved credentials; `sdk/packages/llms/src/providers/http.ts:13` prefers explicit credentials over environment resolution. Task 1 must prove nonblank CLI > environment > saved > onboarding at the startup/provider boundary, including blank overrides and no implicit persistence of temporary keys; Task 5 repeats it through the installed CLI. This finding is source-traced, not a new runtime test result.
- Release risks already covered: `main.ts:149` starts the inherited updater before Shri directory setup; `src/index.ts:31` has a separate daemon entry path. Existing build scripts include Hub webview, upstream identity, environment embedding and platform-specific filesystem assumptions. Tasks 1–5 address those paths and installed/native assets. Do not revive the archived plain-Node/source-publish recommendation or claim a passing source suite proves an npm package.

Plan assessment: The current Node launcher plus embedded-Bun, Windows-first single-agent preview is consistent with the agreed scope. It deliberately postpones real custom orchestration; it does not fulfill the original full multi-agent ambition. Keep that boundary explicit. No rewrite or second live plan is needed. Correct onboarding copy claiming free multi-agent inference and that keys are never sent elsewhere under Task 1's existing copy requirements (`groq-auth.ts:140-142`); authentication is sent to the configured provider.

Verified: Read-only source inspection above; no application tests, build, native renderer or live provider call rerun during this review. `Get-Acl -LiteralPath 'E:\shri-harness'` returned owner `SSN-INSPIRON-35\Dell`; `git branch --show-current` returned `main`; initial `git status --short`, `git diff`, and `git diff --cached` returned no output. The preceding review's `git remote -v` returned no entries. Earlier 44-test and failed-build records remain historical evidence, not fresh verification.

Surprises: Helper-level credential tests missed command-level bypasses, and a defined return code was treated as an auth integration assertion. Source paths and acceptance cases are now explicit so the executor need not infer scope. Runtime uncertainty remains intentional and must be resolved through the specified tests, not optimistic status wording.

Next: In existing workspace `E:\shri-harness`, select GPT-5.6 Terra / high, run recap, read `DOCS/STATUS.md`, this entry and `DOCS/PLAN.md`, then execute Task 0 followed by Tasks 1–7 sequentially without subagents. Follow project source-retrieval/ownership rules. Do not rerun a broad historical review or restart planning. Never expose real keys, bypass publish guards, silently reduce platform support, or publish without the final explicit approval. Confirm the destination GitHub repository when needed for Task 6; native Windows interaction and native installed proof on every advertised platform remain required. Record missing environment capabilities honestly and request only the evidence/input actually needed.

Commit: Documentation-only checkpoint requested; the final response records the actual commit after verification. No remote push is requested.

Verified (checkpoint): `git -c core.safecrlf=false diff --check` exited 0. The PowerShell checklist/requirements/history/scope check returned `Plan audit: 8 tasks; 58 pending steps; 0 completed steps`, `Handoff requirements and task order: PASS; status lines: 28`, `Historical progress log: preserved`, and `Scope: 4 documentation files only`. Its first attempt failed solely because `git show HEAD:DOCS/PLAN.md` used the display casing; Git records `docs/PLAN.md`. Using that tracked spelling passed; no folder rename or application change occurred. The earlier checkpoint already verified selected-path commit behavior in this Git environment.

## Task 0 execution — source fix verified, Windows interaction pending

Root cause: a Groq transcription entry with `maxInputTokens: 0` reaches `ModelRow`. JSX evaluates `0 && <text>` to the raw numeric child `0`; OpenTUI React 0.4.3 rejects that child outside a text node. `buildModelOptions` also admitted dedicated transcription models because it did not apply the existing chat-eligibility filter.

Evidence: the new `model-selector.render.test.tsx` builds a real OpenTUI test renderer/root, wraps the content in the real dialog provider, renders a windowed list containing zero, missing and positive token metadata, and destroys root/renderer in `finally`. Before the fix it exited 1 with the exact `Text must be created inside of a text node` error and a stack through `ModelRow`; changing only zero to missing made it pass. After the fix it passes with the zero row retained, and separately asserts transcription exclusion plus retention of unknown metadata. `bun run test:unit src/utils/chat-models.test.ts src/shri/` passed 12 files / 47 tests on the host retry; the sandboxed variant failed before test discovery with Vite `spawn EPERM`.

Implementation: `ModelRow` renders token metadata only for a finite number greater than zero. Shared `buildModelOptions` now calls `filterChatModels`, covering each model-picker route that consumes the builder. The guard is retained independently of catalog filtering.

Windows limitation: a real PowerShell PTY started `bun run shri` with an isolated `SHRI_DIR` and synthetic key but provided no screen frame or `/model` feedback for 50 seconds; the task-owned process was stopped with Ctrl+C. The repository has no installed Windows PTY driver; its tuistory harness similarly emitted no result after 120 seconds and was stopped. Do not call either a Windows pass. Manual evidence is required: `/model` search, select, cancel, reopen, transcription exclusion and clean return to the prompt, with no key values recorded.

## Task 0 follow-up — Groq reasoning-off request regression — 23/09/2026

Manual Windows evidence after selecting `Off` exposed a second Task 0 bug: the subsequent `hi` failed with `reasoning_effort must be one of low, medium, or high`. The selector itself correctly stored disabled reasoning. The SDK's `resolvePortableReasoning` then converted that disabled request into portable `reasoning: "none"`; Groq rejects that value. A synthetic test first failed with received `"none"`, then the minimal Groq-only disabled path was changed to omit portable reasoning. The regression also verifies the emitted AI SDK stream config has no `reasoning` field. Focused SDK evidence: `bun -F @cline/llms test src/providers/ai-sdk-reasoning.test.ts` passed 15 tests; `bun -F @cline/llms test src/providers/routing/provider-options.test.ts` passed 123 tests; `bun -F @cline/llms typecheck` exited 0. This is not live Groq evidence and does not replace Task 5 installed-package verification. The real Windows retest remains required: select Off, submit `hi`, then exercise cancel/reopen/search without recording a key.

The following Windows result had no invalid-effort error but still displayed `▶ Thinking:`. Current Groq documentation confirms GPT-OSS cannot disable internal reasoning: it accepts only `low`, `medium`, and `high`; hiding returned reasoning uses `include_reasoning: false`. Current AI SDK OpenAI-compatible documentation confirms extra provider-option fields pass through to the request body. Added a named `provider.groq.reasoning-visibility` rule that receives the original disabled intent, despite generic normalization dropping an unsupported native disable, and adds `include_reasoning: false` to Groq's provider/alias buckets. The new `provider-options.test.ts` row first failed because the field was absent; after the rule it passed in 124 tests. The previously added 15-test reasoning suite and package typecheck also pass. This source/routing result still requires an edited-checkout Windows retest: no invalid error and no visible Thinking trace after Off.

Prepared that retest from current compiled source: `bun -F @cline/llms build` exited 0 from `sdk`; `bun test ./src/tui/components/model-selector/model-selector.render.test.tsx` then passed 2 tests / 4 assertions from `apps/cli`. The final Windows visible-terminal check remains the only outstanding Task 0 evidence.

Final Windows evidence (user-run in the rebuilt checkout): `/model` selected a chat model with Off, then `hi` completed with `Hello! How can I assist you today?`; there was no Groq effort error and no `▶ Thinking:` trace. The user then confirmed Escape/cancel and reopen kept the selected model and showed no further bug. Earlier screenshot evidence showed `whisper` yielded only manual custom-ID entry, not a transcription choice. This completes Task 0's source and Windows gate. It does not count as Task 5 installed-artifact proof.

## Task 1 in progress — explicit Groq auth and startup precedence — 23/09/2026

Added synthetic red/green coverage for saved-key replacement, cancellation, masked environment precedence guidance, and startup key precedence. `ensureGroqApiKey` now accepts explicit reconfiguration, keeps ordinary startup reuse intact, handles Ctrl+C as cancellation, preserves saved model/settings when only replacing a key, and no longer claims inference is local or multi-agent. Bare `shri auth` passes reconfiguration intent and reports cancellation. Startup now selects command-line key, then nonblank `GROQ_API_KEY`, then saved key; command-line/environment values are not written to provider settings. Focused final source result: 3 files / 20 tests passed, 85 intentionally excluded by name filter. The full initial `main.test.ts` attempt is not verification: an incomplete mock accidentally opened two task-owned hidden prompts, which were terminated without touching the user's CLI. Task 1 is still open for identity/state/updater/telemetry work and its unfiltered focused suite.
