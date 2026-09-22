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
