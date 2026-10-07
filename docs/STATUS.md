# Project status

## Current state - 08/10/2026, Task 12.2: next.2 tagged and dry-run passed; npm publish failed (E404, nothing published)

- **Project:** `E:shri-harness`, branch `main`. Live plan [PLAN.md](PLAN.md) (Groq conversation and model reliability).
- **Done and committed:** Phase 1 Task 8 (`8b16b5a`), Phase 2 Tasks 9.1 (`4e107a2`) and 9.2 (`75db91c`), Phase 3 Task 10 (`ab3fa24`), Phase 4 Task 11.1 matrix (`d687d61`), Plan issue 7 focus fix and Task 11.2 checkpoint (hashes: see `git log`, messages `fix(tui): refocus prompt after dialog focus restore` and `test(cli): cover installed Groq conversations and model switches`). Older detail: [archive](WORK/archive.md).
- **Task 11.2 checkpoint:** installed model PTY (four switches with exact bodies, 401/empty listings, cancel, reopen, temporary key) and conversation PTY (three reasoning turns, tool pairing, `--id` resume, calibration, key-leak, cleanup) pass on freshly built `0.1.0-next.1` tarballs. [Installed E2E](WORK/2026-10-07/task-11.2-e2e.log) 9/9. Details: PLAN Progress Log, 07/10/2026 Task 11.2 entry.
- **Plan issue 7 (fixed):** the prompt went deaf after `/model` dialogs because the dialog library's 1 ms focus-restore timer re-focused the old textarea before React destroyed it. Fixed by `useFocusAfterRemount` (passive effect) in `use-prompt-input-controller.ts`.
- **08/10:** pushed to GitHub (hosted CI passed, including installed E2E). Gap rows added and proven; installed E2E 9/9. See PLAN Progress Log, 08/10/2026.
- **Matrix:** [groq-repair-test-matrix.md](RESEARCH/groq-repair-test-matrix.md): 22 proven, 3 `n/a` (owner accepted Groq-only scope 08/10). Artifact identity and limits: PLAN Progress Log, Phase 4 checkpoint.
- `tmp/preserved/release-next.1` (git-ignored) still holds the pre-rebuild next.1 release evidence.

## Open owner questions

- **Plan issue 6:** does Groq accept `reasoning_effort` for `openai/gpt-oss-safeguard-20b`? Docs and catalog disagree; live check in Task 12.2.
- Phase 5: push authorized (08/10); Task 12.1 done, [hosted run](https://github.com/shrinivas-sn/shri-harness/actions/runs/37671691809) green. Live calls and candidate tag (12.2) and publish/global update (12.3) still need owner authorization.
- Plan issue 4 fixed 08/10 (`70e9d81`); included in the next.2 candidate.
- **next.2 candidate:** built, installed E2E 9/9, live Groq acceptance passed. Evidence: [release evidence](RESEARCH/groq-repair-release-evidence.md). Your global `shri` is still the old next.1 until next.2 is published and installed.
- Stable plain versions (e.g. `0.2.0`) are a future roadmap item, not now.
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

1. **Task 12.2** (needs owner yes): choose the next unused `0.1.0-next.N`, rebuild, run live acceptance with the key in `.env`, tag a candidate. Settles plan issue 6.
