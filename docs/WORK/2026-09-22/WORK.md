# Work Log: 2026-09-22

## Objective
Implement storage isolation to `~/.shri`, default provider configuration to Groq (`openai/gpt-oss-120b`), and Option B interactive first-time auth setup with secure masked input and comprehensive edge case handling.

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
