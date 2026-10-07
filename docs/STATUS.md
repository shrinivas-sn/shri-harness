# Project status

## Current state - 07/10/2026, Phase 4 Task 11.2 checkpoint committed, gaps open

- **Project:** `E:shri-harness`, branch `main`. Live plan [PLAN.md](PLAN.md) (Groq conversation and model reliability).
- **Done and committed:** Phase 1 Task 8 (`8b16b5a`), Phase 2 Tasks 9.1 (`4e107a2`) and 9.2 (`75db91c`), Phase 3 Task 10 (`ab3fa24`), Phase 4 Task 11.1 matrix (`d687d61`), Plan issue 7 focus fix and Task 11.2 checkpoint (hashes: see `git log`, messages `fix(tui): refocus prompt after dialog focus restore` and `test(cli): cover installed Groq conversations and model switches`). Older detail: [archive](WORK/archive.md).
- **Task 11.2 checkpoint:** installed model PTY (four switches with exact bodies, 401/empty listings, cancel, reopen, temporary key) and conversation PTY (three reasoning turns, tool pairing, `--id` resume, calibration, key-leak, cleanup) pass on freshly built `0.1.0-next.1` tarballs. [Installed E2E](WORK/2026-10-07/task-11.2-e2e.log) 9/9. Details: PLAN Progress Log, 07/10/2026 Task 11.2 entry.
- **Plan issue 7 (fixed):** the prompt went deaf after `/model` dialogs because the dialog library's 1 ms focus-restore timer re-focused the old textarea before React destroyed it. Fixed by `useFocusAfterRemount` (passive effect) in `use-prompt-input-controller.ts`.
- **Matrix:** [groq-repair-test-matrix.md](RESEARCH/groq-repair-test-matrix.md) has 12 rows proven. Open with written gaps: GR-03, 06, 07, 09, 11, 12, 13, 14, 18, 19, 20, 23; GR-25 optional.
- `tmp/preserved/release-next.1` (git-ignored) still holds the pre-rebuild next.1 release evidence.

## Open owner questions

- **Plan issue 4:** after a failed model apply, should the saved model also roll back? (`applyInteractiveModelChange` saves before restarting.)
- **Plan issue 6:** does Groq accept `reasoning_effort` for `openai/gpt-oss-safeguard-20b`? Docs and catalog disagree; live check in Task 12.2.
- Phase 5 needs owner authorization: push/hosted CI (12.1), candidate tag (12.2), publish/global update (12.3).
- **New Groq key ready (owner, 07/10/2026):** in the git-ignored root `.env` as `GROQ_API_KEY` (presence and `gsk_` shape checked, value not read or printed). Use it only for Task 12.2 live acceptance, in disposable config, never in commands, logs or CI. The old saved key is expired; don't reuse it.

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

1. Close the open **Task 11.2** rows, one harness step each, run against a fresh build:
   - GR-13: use a manual unverified ID for a turn. GR-11: send a turn after the 401 notice. GR-14: switch provider away and back. GR-12: malformed and stalled `/models`.
   - GR-06: saved legacy `xhigh` is sent as `high`. GR-07/GR-09: seeded synthetic saved session resumed with `--id`, then read the stored history back.
   - GR-03: 5xx on turn 2. GR-18: search raw captures before redaction. GR-20: PID lineage and Ctrl+C mid-stream. GR-23: global prefix unchanged.
   - Product defects go to Plan issues; then rerun `bun run test:e2e src/commands/installed-release.e2e.test.ts` and update the matrix.
2. Then the **Phase 4 checkpoint** (PLAN), then Phase 5 with owner authorization (push, candidate tag, live key from `.env`).
