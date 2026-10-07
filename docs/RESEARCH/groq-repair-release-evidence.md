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
