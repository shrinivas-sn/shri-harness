# Groq repair — release evidence

## 0.1.0-next.2 candidate (08/10/2026)

- **Version:** `0.1.0-next.2`, lowest unused (`v0.1.0-next.0` and `v0.1.0-next.1` tags exist; npm has only `0.1.0-next.1`).
- **Local build:** [build log](../WORK/2026-10-08/task-12.2-build.log). Wrapper sha256 `fb201dd5da0def800e3f8f5adf05641a235bb55db6723a2d633ceeaab180ef03` (10,824 B); windows-x64 sha256 `7634255306209624317b9a1b3b990566ff7e11f36e17498cdc1151d89d97245d` (44,790,232 B).
- **Installed E2E (fixtures):** [9/9](../WORK/2026-10-08/task-12.2-e2e.log) on those tarballs.
- **Live acceptance (real Groq, owner's key from `.env`, disposable state):** [report](../WORK/2026-10-08/task-12.2-live.json), `passed: true`.
  - Turns on GPT OSS 120B: remember a word, recall it (the original turn-2 `reasoning_content` failure), read a fixture file with a tool, then recall again after `--id` resume — all four ok.
  - `/model` switches: GPT OSS 20B ok, Qwen 3.8 27B ok. Llama 3.1 8B and Llama 3.3 70B are not offered for this key (unavailable), so no live non-reasoning turn; fixture tests cover that wire shape.
  - Safety GPT OSS 20B: rejected by the account's 2,000 tokens-per-minute limit (request about 6–7k tokens). Plan issue 6 (does Groq accept `reasoning_effort` for Safeguard?) stays open; the model is unusable on this tier either way.
  - Global install unchanged; key never in arguments, settings or logs (report scanned).
- **Harness:** `apps/cli/script/smoke-installed-live-pty.mjs`, run with `bun script/smoke-installed.ts --target windows-x64 --live-env <path to .env>`.
- **Tag:** `v0.1.0-next.2` (annotated) on `aaf7067`.
- **Hosted dry run:** [release run 37678370899](https://github.com/shrinivas-sn/shri-harness/actions/runs/37678370899), `publish=false`: preflight and verify (full CI including installed E2E) passed; publish skipped. Its artifact passed `check-publish-inputs.mjs` locally. Hosted hashes differ from the local build (each build produces its own bytes): wrapper `d6a53a93f1f010900ebe56654e18e2b5e634f44d18d100e1ca1792b9893b4fed`, windows-x64 `7dad5cce97371795f488f3d31c2025ce62a83fe90888001da01d6d832ed22188`.
- **Owner's machine:** global `shri` updated to the locally built and tested next.2 tarballs (hashes above) on 08/10/2026; roll back with `npm install -g @shrinivas-sn/shri@0.1.0-next.1`.
- **Publish run:** [release run 37679726336](https://github.com/shrinivas-sn/shri-harness/actions/runs/37679726336), `publish=true`, owner-approved. Preflight and verify (full CI including installed E2E) passed; the publish step failed on the first package: `npm error code E404 … PUT https://registry.npmjs.org/@shrinivas-sn%2fshri-windows-x64 - Not found` after npm signed a provenance statement. Registry checked afterwards: both packages still only have `0.1.0-next.1` (`next` and `latest`), so nothing was published and `0.1.0-next.2` remains free. Trusted publishing (configured by the owner on 24/09, never exercised) is therefore still unproven; the likely causes are the npm trusted-publisher settings or how the workflow authenticates, to be confirmed against current npm docs before any workflow change.
- **Published (08/10/2026):** the owner ran `npm publish` for the local verified tarballs, platform package first, then the wrapper, with `--tag next --access public --ignore-scripts`. npm debug logs on the owner's machine show `PUT 401` (2FA prompt) then `PUT 202` and exit 0 for both. Registry then showed `@shrinivas-sn/shri` versions `0.1.0-next.1, 0.1.0-next.2` with `next` = `0.1.0-next.2`, `latest` = `0.1.0-next.1`. No provenance (manual publish).

