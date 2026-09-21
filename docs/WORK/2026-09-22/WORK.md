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
