# Project status

## Current state - 08/10/2026, 0.1.0-next.2 published to npm

- **Project:** `E:shri-harness`, branch `main`, pushed to `shrinivas-sn/shri-harness`. Live plan [PLAN.md](PLAN.md) (Groq conversation and model reliability). Older status: [archive](WORK/archive.md).
- **Phases 1–4 done;** Phase 5 Tasks 12.1 (hosted gates) and 12.2 (candidate) done. Fixes: Groq `reasoning_content` replay, model discovery/selection, per-model reasoning options, prompt focus after dialogs (issue 7), saved-model rollback on a failed switch (issue 4).
- **Published 08/10/2026:** `@shrinivas-sn/shri-windows-x64@0.1.0-next.2` then `@shrinivas-sn/shri@0.1.0-next.2`, by the owner with `npm publish <tgz> --tag next --access public --ignore-scripts` from the local verified tarballs (`apps/cli/dist/npm/tarballs`; sha256 `7634255…` and `fb201dd…`). Owner's npm logs: `PUT 202`, exit 0 for both. Registry shows wrapper `next` = `0.1.0-next.2`; `latest` still `0.1.0-next.1`. Manual publish, so no provenance.
- **Evidence:** [release evidence](RESEARCH/groq-repair-release-evidence.md) (installed E2E 9/9, live Groq acceptance passed, tag `v0.1.0-next.2` on `aaf7067`, hosted dry run green). [Matrix](RESEARCH/groq-repair-test-matrix.md): 22 proven, 3 `n/a` (Groq-only scope).
- **Owner's machine:** global `shri` is `0.1.0-next.2`, installed from the same local tarballs. Roll back: `npm install -g @shrinivas-sn/shri@0.1.0-next.1`.
- **Trusted publishing broken:** `release.yml` publish failed with npm E404 twice (run 37679726336), even after the owner re-enabled the trusted publisher. Nothing was published by it.

## Open owner questions

- Move npm `latest` from `0.1.0-next.1` (has the replay bug) to `0.1.0-next.2`? Owner runs `npm dist-tag add @shrinivas-sn/shri@0.1.0-next.2 latest` (and the same for `-windows-x64`).
- **Plan issue 6:** Safeguard `reasoning_effort` unconfirmed; the live call hit the account's 2,000 tokens-per-minute limit.

## Execution constraints

- Work sequentially, self-review, no subagents. Owner `SSN-INSPIRON-35Dell`; follow SDK AGENTS.md files.
- Git tracks `docs/` while disk shows `DOCS/`: stage doc files one path at a time with the lowercase path.
- Push with the command-scoped helper: `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin main` (default SSH is another account).
- Groq key: git-ignored root `.env` `GROQ_API_KEY`; use only via `smoke-installed.ts --live-env`; never print it.
- Releases: one `publish=true` run is normal; dry run only after release-setup changes (RELEASE.md gate 5). Publishing from Claude needs the owner's explicit go-ahead.
- Broad inherited CLI suite failures remain a recorded limitation; no full-suite pass claimed.

## Next up (start here)

1. **Post-publish check (RELEASE.md, after publishing):** once `npm view @shrinivas-sn/shri-windows-x64 versions` lists `0.1.0-next.2`, install `@shrinivas-sn/shri@next` into a fresh disposable prefix with `--ignore-scripts`, confirm `shri --version` and the registry integrity against the local tarball hashes, and record it in the release evidence and PLAN Task 12.3.
2. **Before the next release:** fix GitHub trusted publishing. Retrieve current npm trusted-publishing docs (`/context-brief`), compare with `release.yml` (setup-node `registry-url` token handling, npm version, provenance) and both packages' npm settings, then release with one `publish=true` run.
3. Owner decision above on `latest`.
