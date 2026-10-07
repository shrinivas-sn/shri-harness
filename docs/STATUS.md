# Project status

## Current state - 07/10/2026, Phase 4 Task 11.2 in progress

- **Project:** `E:\shri-harness`, branch `main`. Live plan [PLAN.md](PLAN.md) (Groq conversation and model reliability).
- **Done and committed:** Phase 1 Task 8 (`8b16b5a`), Phase 2 Tasks 9.1 (`4e107a2`) and 9.2 (`75db91c`), Phase 3 Task 10 (`ab3fa24`), Phase 4 Task 11.1 matrix (`d687d61`). Older checkpoint detail: [archive](WORK/archive.md), 07/10/2026 entry.
- **Task 11.2 (uncommitted harness work):**
  - Fresh artifacts built, packaged, verified (all exit 0): [build log](WORK/2026-10-07/task-11.2-build.log). Pre-rebuild next.1 release evidence copied byte-identical to `tmp/preserved/release-next.1` (gitignored) because `script/build.ts` wipes `apps/cli/dist`.
  - `apps/cli/script/smoke-installed-model-pty.mjs` rewritten: loopback `/models` + chat + catalog fixture (fixes Finding F1), `--key` temporary key, strict option rejection, cancel-in-thinking-dialog, four switches, failure/empty notices.
  - **Run 5 result:** in the installed binary all four switches sent exactly the expected bodies (GPT-OSS 120B `high`; Llama none; GPT-OSS 20B `include_reasoning:false`; Qwen 3.8 `low`) and the picker listed only `/models` entries. Run then failed at the next harness step (`slash suggestion` before the 401 notice check) — harness timing, not yet diagnosed: [run 5 log](WORK/2026-10-07/task-11.2-model-run5.log). Runs 1–4 fixed harness waits (welcome text gone after first message; loading overlay; dropped keystrokes during session restart).
  - `apps/cli/script/smoke-installed-conversation-pty.mjs` written (3 turns with reasoning, tool pairing, `--id` resume, calibration, key-leak, cleanup) — **never run yet**.
  - `apps/cli/script/smoke-installed.ts` wired: `MODEL_PTY_CHECKS`, `CONVERSATION_PTY_CHECKS`, `--conversation-pty`. `src/commands/installed-release.e2e.test.ts` **not yet updated** for the new checks.
- **Matrix:** [groq-repair-test-matrix.md](RESEARCH/groq-repair-test-matrix.md) rows GR-01–GR-25 all still `unproven` (no row updated until a full passing run).

## Open owner questions

- **Plan issue 4:** after a failed model apply, should the saved model also roll back? (`applyInteractiveModelChange` saves before restarting.)
- **Plan issue 6:** does Groq accept `reasoning_effort` for `openai/gpt-oss-safeguard-20b`? Docs and catalog disagree; live check in Task 12.2.
- Phase 5 needs owner authorization: push/hosted CI (12.1), live key + candidate tag (12.2), publish/global update (12.3).

## Execution constraints and pending evidence

- Work sequentially, self-review, no subagents. Verify workspace owner `SSN-INSPIRON-35\Dell` before writes; follow SDK AGENTS.md files.
- Preserve stored reasoning, tool relationships, unrelated work, active credentials, and the user's saved model. Fixtures use isolated synthetic state and loopback only.
- Git tracks `docs/` while disk shows `DOCS/`: stage tracked doc files with the lowercase path.
- Source changes do not update the global executable. Installed, live-provider, hosted, and registry evidence are separate gates.
- Broad inherited CLI suite failures/hangs remain recorded limitations; Phase 1's original 5-second focused command still fails (bounded `--maxWorkers 1 --testTimeout 120000` passes). No full-suite pass claimed.
- Trusted publishing remains unproved; choose the next unused prerelease at execution time (next.2 not reserved).
- Use the recorded command-scoped GitHub HTTPS helper for remote work; default SSH uses another account.
- `E:\dev-recipes`: Groq brief `_knowledge/cache/groq-reasoning-controls.md` and `groq-api` entry in `_knowledge/sources.yaml` added this session.

## Next up (start here)

1. Continue **Task 11.2**: from `apps/cli`, run `bun script/smoke-installed.ts --target windows-x64 --model-pty`; diagnose the `slash suggestion` timeout after the switch block (likely typing `/model` before the post-reply UI settles — reuse `waitForPrompt`/stable-screen before `openModelPicker`). Then run `--conversation-pty`, fix harness-only issues (product defects go back to their owning task via Plan issues), update `installed-release.e2e.test.ts` to assert every new check, run the full Task 11.2 verify set, update matrix rows with real evidence, and commit `test(cli): cover installed Groq conversations and model switches`.
