# Project status

Single running log — update in place each session, don't fork new files or append without pruning stale lines. This is the primary source `/recap` reads for "where things stand."

## Current state
- Shri V1 architecture and standalone auth fully operational in `E:\shri-harness`.
- Isolated storage verified at `~/.shri/data/settings/providers.json`.
- Live inference tested and confirmed: Groq backend running `openai/gpt-oss-120b` with thinking traces and $0.00 cost.
- All 11 Shri test suites passing (44/44 unit tests pass).
- Commands verified: `shri -i` (TUI), `shri auth`, `shri <prompt>`, `shri:pipeline`.

## Pending
- Package bundling and npm release configuration for `@shrinivas-sn/shri`.
- Global installation test (`npm install -g .` or `bun link`).

## Next up (start here)
1. Configure `apps/cli/package.json` with package name `@shrinivas-sn/shri` and binary mappings.
2. Build production artifacts (`bun run build`).
3. Install/link globally and test typing bare `shri` from any directory.
4. Prepare npm publish script for `shrinivas-sn` account.
