# 21/09/2026 — Shri V1 Baseline Extraction & Orchestration Delivery

<!-- Title date is DD/MM/YYYY (display). The folder name this file lives in stays
YYYY-MM-DD for correct sorting — don't rename the folder to match the title. -->
<!-- Add a matching row to DOCS/README.md the same session this file is created. -->

## Plan
- Extract clean CLI, Hub, and SDK packages from Cline into standalone `E:\shri-harness`.
- Strip 603MB `.git` history, VS Code extension, desktop app, and marketing docs.
- Set up workspaces in `package.json` and verify `bun install` and `bun run build:sdk`.
- Verify CLI runs from source and unit tests run.
- Adopt standard canonical `DOCS/` structure and import `.agents/skills`.
- Implement Shri V1 orchestration modules across all 8 planned tasks using TDD.

## Execution
- Copied `apps/cli`, `apps/cline-hub`, `sdk/packages`, `sdk/scripts`, `patches`, root configs.
- Size reduced from >1,000MB to 18.27MB (98.2% reduction).
- Added missing `apps/tsconfig.apps.json` and `apps/biome.json` so CLI unit tests compile without errors.
- Verified SDK build: all 6 packages exited code 0.
- Established canonical `DOCS/` with `CONTEXT/PRD.md`, `CONTEXT/DECISIONS.md`, `RESEARCH/groq-models.md`, `STATUS.md`, and `README.md`.
- Imported `.agents/skills` (`cline-sdk`, `opentui`, `create-pull-request`).
- Implemented Task 1: Core types and schemas with Zod (`types.ts`, 5 tests pass).
- Implemented Task 2: Compact tool registry and dynamic tool assignment (`tools/`, 4 tests pass).
- Implemented Task 3: Model Router with capability matching and fallback (`router/`, 5 tests pass).
- Implemented Task 4: BudgetManager and ExecutionScheduler (`scheduler/`, 3 tests pass).
- Implemented Task 5: Coordinator planning and synthesis (`coordinator/`, 3 tests pass).
- Implemented Task 6: Context isolation and standard envelope (`agent/`, 3 tests pass).
- Implemented Task 7: Run persistence and audit log (`persistence/`, 2 tests pass).
- Implemented Task 8: Main pipeline and `shri` executable binary (`index.ts`, `bin.ts`, `e2e.test.ts`, 2 tests pass).
- Verified full test suite: 8 test files, 27/27 tests passed in 2.54s.
- Verified live binary run: `bun run shri "Analyze repository git history and check build status"`.

## Notes
- `vitest.config.ts` in `apps/cli` uses `maxWorkers: 1` and `fileParallelism: false` across 138 test files. Targeted test runs (e.g. `bun -F @cline/cli test:unit src/shri/`) run in under 3 seconds.
