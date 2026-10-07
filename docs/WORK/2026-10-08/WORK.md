# 08/10/2026 — Plan issue 4 and Task 12.1

Continues: [07/10/2026 work](../2026-10-07/WORK.md) and [the live plan](../../PLAN.md).

## Plan issue 4

- Owner said yes to rolling back the saved model when a model apply fails.
- Fix in `applyInteractiveModelChange`; red [log](issue-4-red.log), green [log](issue-4-green.log), [typecheck](issue-4-typecheck.log).

## Task 12.1

- CI gates added and verified locally and on [hosted run 37671691809](https://github.com/shrinivas-sn/shri-harness/actions/runs/37671691809). Logs: `task-12.1-*`.

## Task 12.2 candidate

- Owner approved the live test and tag; global `shri` confirmed as old next.1 (explains the owner's screenshot of the original error).
- Version 0.1.0-next.2 built; installed E2E 9/9; live acceptance passed after harness-only fixes (wrapped prompt echo, resume wait, list-row availability, settle before quit, account-limit classification). See [release evidence](../../RESEARCH/groq-repair-release-evidence.md).
- Noticed: once, quitting right after a tool reply resumed without that final reply (likely saved after the turn ends); not reproduced after waiting for the screen to settle.

## Publish

- Release workflow publish failed (npm E404, twice). Owner published both next.2 packages manually from the local verified tarballs (npm `PUT 202`, exit 0). Global `shri` on the owner's machine is next.2.

## Registry check

- Both packages visible on npm at 0.1.0-next.2 (`next`); sha1 matches the tested tarballs; fresh-prefix `@next` install prints 0.1.0-next.2.

## Resume

Continue per DOCS/STATUS.md "Next up".
