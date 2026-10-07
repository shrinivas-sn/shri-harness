## 08/10/2026 - Status before the next.2 publish checkpoint

Historical snapshot, preserved verbatim from DOCS/STATUS.md. Superseded by the current DOCS/STATUS.md.

### Current state - 08/10/2026, Task 12.2: next.2 tagged and dry-run passed; npm publish failed (E404, nothing published)

- **Project:** `E:shri-harness`, branch `main`. Live plan [PLAN.md](PLAN.md) (Groq conversation and model reliability).
- **Done and committed:** Phase 1 Task 8 (`8b16b5a`), Phase 2 Tasks 9.1 (`4e107a2`) and 9.2 (`75db91c`), Phase 3 Task 10 (`ab3fa24`), Phase 4 Task 11.1 matrix (`d687d61`), Plan issue 7 focus fix and Task 11.2 checkpoint (hashes: see `git log`, messages `fix(tui): refocus prompt after dialog focus restore` and `test(cli): cover installed Groq conversations and model switches`). Older detail: [archive](WORK/archive.md).
- **Task 11.2 checkpoint:** installed model PTY (four switches with exact bodies, 401/empty listings, cancel, reopen, temporary key) and conversation PTY (three reasoning turns, tool pairing, `--id` resume, calibration, key-leak, cleanup) pass on freshly built `0.1.0-next.1` tarballs. [Installed E2E](WORK/2026-10-07/task-11.2-e2e.log) 9/9. Details: PLAN Progress Log, 07/10/2026 Task 11.2 entry.
- **Plan issue 7 (fixed):** the prompt went deaf after `/model` dialogs because the dialog library's 1 ms focus-restore timer re-focused the old textarea before React destroyed it. Fixed by `useFocusAfterRemount` (passive effect) in `use-prompt-input-controller.ts`.
- **08/10:** pushed to GitHub (hosted CI passed, including installed E2E). Gap rows added and proven; installed E2E 9/9. See PLAN Progress Log, 08/10/2026.
- **Matrix:** [groq-repair-test-matrix.md](RESEARCH/groq-repair-test-matrix.md): 22 proven, 3 `n/a` (owner accepted Groq-only scope 08/10). Artifact identity and limits: PLAN Progress Log, Phase 4 checkpoint.
- `tmp/preserved/release-next.1` (git-ignored) still holds the pre-rebuild next.1 release evidence.

### Open owner questions

- **Plan issue 6:** does Groq accept `reasoning_effort` for `openai/gpt-oss-safeguard-20b`? Docs and catalog disagree; live check in Task 12.2.
- Phase 5: push authorized (08/10); Task 12.1 done, [hosted run](https://github.com/shrinivas-sn/shri-harness/actions/runs/37671691809) green. Live calls and candidate tag (12.2) and publish/global update (12.3) still need owner authorization.
- Plan issue 4 fixed 08/10 (`70e9d81`); included in the next.2 candidate.
- **next.2 candidate:** built, installed E2E 9/9, live Groq acceptance passed. Evidence: [release evidence](RESEARCH/groq-repair-release-evidence.md). The owner's global `shri` is next.2, installed 08/10 from these local tarballs (not from npm). npm still has only next.1.
- Stable plain versions (e.g. `0.2.0`) are a future roadmap item, not now.
- **New Groq key ready (owner, 07/10/2026):** in the git-ignored root `.env` as `GROQ_API_KEY` (presence and `gsk_` shape checked, value not read or printed). Use it only for Task 12.2 live acceptance, in disposable config, never in commands, logs or CI. The old saved key is expired; don't reuse it.

### Execution constraints and pending evidence

- Work sequentially, self-review, no subagents. Verify workspace owner `SSN-INSPIRON-35\Dell` before writes; follow SDK AGENTS.md files.
- Preserve stored reasoning, tool relationships, unrelated work, active credentials, and the user's saved model. Fixtures use isolated synthetic state and loopback only.
- Git tracks `docs/` while disk shows `DOCS/`: stage tracked doc files with the lowercase path.
- Source changes do not update the global executable. Installed, live-provider, hosted, and registry evidence are separate gates.
- Broad inherited CLI suite failures/hangs remain recorded limitations; Phase 1's original 5-second focused command still fails (bounded `--maxWorkers 1 --testTimeout 120000` passes). No full-suite pass claimed.
- Trusted publishing remains unproved; choose the next unused prerelease at execution time (next.2 not reserved).
- Use the recorded command-scoped GitHub HTTPS helper for remote work; default SSH uses another account.
- `E:\dev-recipes`: Groq brief `_knowledge/cache/groq-reasoning-controls.md` and `groq-api` entry in `_knowledge/sources.yaml` added this session.

### Next up (start here)

0. **Before the next release:** fix GitHub trusted publishing. `release.yml` publish failed twice with npm E404 (run 37679726336, attempts 1–2) even after the owner re-enabled the trusted publisher. Retrieve current npm trusted-publishing docs (`/context-brief`), compare with `release.yml` (setup-node `registry-url` token handling, npm version, provenance) and both packages’ npm settings, fix, then publish the next version with one `publish=true` run. For next.2 the owner chose a manual publish from the local verified tarballs (no provenance); not yet run as of this note.

1. **Task 12.2** (needs owner yes): choose the next unused `0.1.0-next.N`, rebuild, run live acceptance with the key in `.env`, tag a candidate. Settles plan issue 6.

## 07/10/2026 - Status sections moved during Task 11.2

Historical snapshot, preserved verbatim from DOCS/STATUS.md. Superseded by the current DOCS/STATUS.md.

### Phase 3 checkpoint - 07/10/2026

- **Task 10 / R12 done (`ab3fa24`):** Groq gets only reasoning fields the selected model's catalog controls advertise (official docs re-checked 07/10/2026). GPT-OSS keeps low/medium/high (legacy `xhigh`→`high`, `minimal`→`low`) and Off hides its trace; Qwen 3.8/Safeguard get efforts but no visibility field; Llama, Qwen 3.6 and unknown IDs get no reasoning fields. The thinking dialog offers only supported levels.
- **Verification:** SDK 399/399 (5 files incl. R10 history), LLM/shared typechecks, CLI 50/50 unit + 8/8 render + typecheck, neighbor suites 71 + 36 passing.
- **Plan issues 5–6:** defect was wider than planned (portable path skipped normalization for all Groq models). **Open for live check (issue 6):** does Groq accept effort for `gpt-oss-safeguard-20b`? Docs and catalog disagree.
- **Still open (issue 4):** roll back saved model after a failed apply?
- Next was Task 11.1 (done above).

### Phase 2 checkpoint - 07/10/2026

- **Phase 1 committed:** fix `8b16b5a`, docs `efd82f7`. Bounded gate re-run first: 182/182, both typechecks exit 0.
- **Task 9.1 committed `4e107a2`:** bounded `discoverGroqModels` and pure `reconcileGroqModels`.
- **Task 9.2 / R11 source+picker done (`75db91c`):** `/model` on Groq lists only models the effective key's endpoint returns and the catalog proves tool-capable. Failure keeps the catalog with an `Availability not verified` notice; an empty list offers manual entry with a capability warning. Selection is staged until every dialog succeeds; failed apply restores the in-memory model and effort.
- **Verification:** 49/49 Vitest (discovery + controller), CLI typecheck exit 0, 5/5 Bun native renderer; red evidence recorded for both test files.
- **Plan issues 3–4:** Vitest cannot load the picker `.tsx`, so wiring is proved through an extracted controller (hook glue: typecheck/review only). **Owner decision open (issue 4):** should a failed apply also roll back the saved model? `applyInteractiveModelChange` saves before restarting.
- **Evidence:** [07/10/2026 work](WORK/2026-10-07/WORK.md), [PLAN Progress Log](PLAN.md#progress-log).
- **Limits:** installed TUI, live Groq `/models`, hosted CI, registry remain pending; installed model smoke may now take the notice path if its fixture lacks `/models` (Phase 4).
- Next was Phase 3, Task 10 (done above).

### Phase 1 checkpoint - 26/09/2026

- **Task 8 / R10 completed locally with the verification adjustment in Plan issue 2.** Builtin Groq now omits outgoing reasoning history while preserving input/stored reasoning, incoming events, text, and tool relationships. Both GPT-OSS IDs have gateway and real-adapter regression coverage.
- **Verification:** 182/182 focused tests passed with `--maxWorkers 1 --testTimeout 120000`; LLM and shared typechecks passed; diff check passed. The original 5-second invocation still recorded 8 existing failures after repair, so it is not claimed as passing.
- **Plan issues 1–2:** sandbox Bun launcher required approved host execution; measured existing-test delays required a bounded sequential verification run. That run retained all assertions, including Cerebras aliases and Vertex signed history. The root cause of slow initialization remains unproved.
- **Evidence:** [Task 8 record and logs](WORK/2026-09-26/TASK-8.md), [PLAN Progress Log](PLAN.md#progress-log). Fourteen new cases; 12 Groq cases were observed failing before the repair.
- **Limits:** source/wire fixtures only; installed TUI, persisted-session disk acceptance, live provider, hosted CI, and registry gates remain pending. Generic-compatible provider-options deprecation warning retained. No broad-suite pass claimed.
- **Commit:** `8b16b5a` on 07/10/2026 at the owner's request, after re-running the bounded gate (182/182 again, both typechecks exit 0). Ownership verified before writes, no subagents, previous planning/unrelated work preserved. No live credentials, publication, global install, version changes, or dependency updates.
- **Stopped at Phase 1. Next: Phase 2, Task 9.1.**

### Planning state before Task 8 - 26/09/2026

- Planning only: the owner requested a proper plan and explicitly said not to execute it. No application code, tests, builds, credentials, installations, or releases were changed/run.
- [PLAN.md](PLAN.md) now contains five sequential repair phases with full task cards, test-first requirements, checkpoints, failure handling, owner inputs, and a Plan issues log.
- The previous plan and full historical Progress Log are preserved byte-for-byte in [the planning snapshot](WORK/2026-09-26/PLAN-before-restructure.md). Completed Tasks 0–7 must not be restarted; all open Tasks 8–12 remain carried forward.
- The last recorded published Windows x64 preview is @shrinivas-sn/shri@0.1.0-next.1. Registry and global installation were not rechecked this session.
- At planning time, the main defect was later TUI requests replaying unsupported reasoning_content. The historical reproduction remains in [the diagnosis](RESEARCH/chat-model-errors.md); Task 8 now adds source/wire repair evidence, while fixed installed-build and live evidence remain pending.
- Planning also confirmed effective-configuration discovery gaps, missing-capability effort handling, a visibility rule broader than its GPT-OSS description, and model mutation before selection finishes.
- Custom multi-agent orchestration remains simulated/deferred. Linux/macOS, rate-limit UX, global -m persistence, and broader integrations remain outside this repair.


## 24/09/2026 - Status before chat-repair handoff cleanup

Historical snapshot, preserved verbatim. Its older pending/resume statements are superseded by DOCS/STATUS.md.

# Project status

Single running log — update in place each session, don't fork new files or append without pruning stale lines. This is the primary source `/recap` reads for "where things stand."

## Current state — as of 24/09/2026
- The interactive Shri CLI uses the existing Cline execution engine with Groq `openai/gpt-oss-120b`; prior user-run live inference is recorded in `WORK/2026-09-22/WORK.md`.
- Normal CLI configuration defaults to `~/.shri`; Task 1 now resolves and propagates the Shri storage environment before normal CLI, daemon, and ACP runtime access. Installed child/daemon proof remains Task 5.
- Task 1 source verification: `bun -F @cline/cli test:unit src/shri/ src/commands/update.test.ts src/commands/auth.test.ts src/main.test.ts` passed 15 files / 153 tests. CLI typecheck now passes. This does not prove installed-package behavior.
- The custom `shri:pipeline` has scaffolding and simulated execution; its reported run record is not written to disk. Real custom multi-agent execution is deferred.
- Task 2 produced a fresh Windows terminal artifact: `bun run build:sdk` and `bun run build:platforms:single` passed; `dist/cli-windows-x64/bin/cline.exe --version` returned `0.1.0-next.0`.
- User approved planning a single-agent npm preview first, with real multi-agent functionality afterward.
- `PLAN.md` is the canonical revised execution plan. Task 0 has a source fix and regression; no package was published.
- Task 0 is complete: `/model` has a real-renderer regression and Windows proof for opening, search, selection, Off, prompt return, Escape/cancel and reopen. Zero-token transcription rows are filtered/guarded; Groq Off omits unsupported `"none"` and hides GPT-OSS reasoning output. Installed-artifact repetition remains Task 5.
- Task 1 is complete at source level. Bare `shri auth` replaces saved keys with masked guidance/cancellation safety; startup tests cover command-line > environment > saved precedence without persisting temporary overrides. The source package is private/Shri-preview identified, automatic updates are disabled, and the telemetry handle is no-op. Installed-package proof remains Task 5.
- Task 2 is complete. Terminal builds default to no Hub webview, use native staging/cleanup APIs, reject unsupported build flags, and omit telemetry/OTEL build-time injection. The dashboard command fails safely when its opt-in assets are absent; the fresh executable contains only its binary, platform manifest, and plugin bootstrap. Task 4 verified those assets in generated npm tarballs.
- Task 3 is complete at the local Windows gate. `package:release --target windows-x64` generates Shri wrapper/platform folders with README, LICENSE, NOTICE, CA helper, executable and plugin bootstrap. An offline, lifecycle-disabled install of those folders launched `--version` with empty `PATH` and no Bun; 46 focused tests passed, 2 platform-specific cases skipped on Windows, and CLI typecheck passed. This is folder-install proof, not tarball or registry acceptance.
- Task 4 is complete for the explicitly generated wrapper and Windows x64 target. Real offline, lifecycle-disabled npm tarballs passed path/inventory, credential, manifest/dependency, license/NOTICE/README, embedded-asset, source/artifact equality and patch-input checks. A synthetic Groq-key build/config canary was absent from build logs, artifacts, tarballs and report. `dist/npm/verification-report.json` records sizes and SHA-256. The combined focused suite passed 66 tests with 2 Windows skips; typecheck passed. This is tarball inspection, not installed native interaction.
- Task 5 is in progress on Windows x64. A disposable consumer installs the exact verified wrapper/platform tarballs offline with npm lifecycle scripts disabled, then exercises the npm command shim and local npx from an unrelated Unicode/space-containing path with no Bun on the installed runtime PATH. Headless help/version/missing-key, synthetic saved-key quick setup, and absent-optional-package checks pass. A real Node-backed PTY starts the installed TUI, survives eight idle seconds, shuts it down with Ctrl+C, and verifies interactive saved-key replacement/cancellation without exposing raw keys. Installed `/model` opens, filters baked zero-token Groq transcription choices, and requests a loopback Groq catalog fixture whose chat entry omits optional model metadata; it renders that entry, excludes the fixture transcription entry, selects a chat model, reopens and cancels while the prompt remains usable. The picker honors a saved model-catalog URL. An installed native executable streams against a loopback Groq-compatible fixture, proves CLI > environment > saved key selection without persisting temporary keys, reads one disposable file, runs one harmless local command, rejects invalid auth, recovers after one transient 503, and aborts an interrupted stream after its configured timeout. A second installed PTY renders a streamed fenced TypeScript block with distinct keyword and number colors. Separate installed processes read persisted session history after restart; their `sessions.db` is under disposable Shri state and absent from fake Cline state. Installed `hub status` ignores a valid-looking fake Cline discovery record. An installed daemon starts on an ephemeral loopback port, writes discovery and log files under Shri, reports its test-owned PID, and stops with discovery removed; the fake Cline record remains unchanged and no `shri` process remains. This is Windows synthetic/loopback proof, not native cross-platform or live Groq proof.
- First-preview release scope is now Windows x64 only, while Linux x64/glibc and macOS arm64 remain future targets in the general platform model. The launcher derives supported platforms from generated wrapper dependencies instead of a hardcoded three-target list. Newly generated Windows-only wrapper/platform tarballs passed local artifact checks; after the Windows path-mention fix, their installed E2E suite passed 8/8 in 179.61s.
- The public source is pushed to `shrinivas-sn/shri-harness` through a command-scoped GitHub CLI HTTPS credential helper; global Git/SSH configuration was not changed. GitHub CLI and npm CLI authenticate as `shrinivas-sn`. No GitHub release has been created.
- Hosted Windows CI passes build, typecheck, the 230-test focused source suite (2 skips), packaging and tarball verification. The former nondeterministic 7/8 installed result (a TUI-prewarmed detached hub kept `shri.exe` locked → `EACCES`) is fixed by `1010f25`; the installed suite passed 8/8 on 3 consecutive hosted attempts of run `35877150073`.
- Live Groq gate (RELEASE.md gate 4) passed 23/09/2026 on locally built, verified tarballs installed offline into a disposable folder (lifecycle scripts off, no Bun on PATH), using the user's saved `~/.shri` Groq key as the user directed: plain reply in ~5s; read file + ran command via tools. It exposed a real bug, fixed in `15051e0`: `read_files` resolved relative paths against the host process cwd instead of the session cwd, so `shri -c <dir>` (and editor/ACP hosts) read the wrong file or hit ENOENT. Regression test added; core tool tests 416 passed / 1 skipped; core + CLI typecheck and biome clean; live re-test under `-c` read the file correctly. Local installed suite: 7/8 while a live run shared the machine (one `spawnSync` 50s timeout in PTY startup), then 8/8 alone. Hosted CI `35901754687` green on `15051e0`.
- **PUBLISHED 24/09/2026: `@shrinivas-sn/shri@0.1.0-next.1` and `@shrinivas-sn/shri-windows-x64@0.1.0-next.1`** (the user ran it interactively with 2FA, platform first). `v0.1.0-next.0` (on `15051e0`) was tagged but never published; it was superseded so the new user-facing package README (`aec0fd6`) could ship without rewriting a pushed tag. Release commit `802da20`, tag `v0.1.0-next.1`. Release dry run `35906035200`: attempt 1 failed only on a hosted 20s timeout in the render PTY stage (the push CI `35906029610` for the same commit also hit a 15s `distribution-package` pack-test timeout). Locally, installed E2E passed 8/8 and the pack test passed in 2s; attempt 2 passed. Registry integrity matches the CI artifact: platform `sha512-ApZnFfby…f11w==` (sha256 `7c381ac8…8596`), wrapper `sha512-knw8Tqf…iHrg==` (sha256 `31a9066a…9d1f`). npm set both `next` and `latest` to `0.1.0-next.1`, which is automatic for a first publish. Registry install into a fresh prefix (`--ignore-scripts`, no Bun on PATH) nested the platform package under the wrapper; `shri --version` = `0.1.0-next.1`; a live Groq `read_files` prompt returned `WORD=marigold`; `npx @shrinivas-sn/shri@next --version` worked; no `shri.exe` was left running.
- Groq free-tier limit (measured via response headers): 8,000 tokens/min for `openai/gpt-oss-120b` (and every other chat model on this key: 6–8k). Each Shri turn sends ~4.6k input tokens, so turns after the first within a minute wait ~33s for their first chunk with no on-screen notice. That is an account limit, not a hang. Candidate follow-ups: show a "rate-limited, retrying" notice; trim the per-turn system prompt/tool schema.
- Minor UX: a single bare word prompt (`shri hi`) is rejected as an unknown command.

## Pending
- **Diagnosis update, 24/09/2026:** Source tracing and an in-memory reproduction using installed `@ai-sdk/openai-compatible@3.0.37` confirm that retained assistant reasoning serializes into `reasoning_content`. `shouldIncludeReasoningHistory` currently excludes only Cerebras, leaving Groq exposed. A synthetic strict endpoint accepted turn one and rejected turn two with the recorded error. This is adapter/request evidence, not a fresh live Groq or TUI reproduction; no fix has been applied. See `RESEARCH/chat-model-errors.md` for the separate model-discovery and reasoning-option findings. Proposed future work is in `CONTEXT/ROADMAP.md`. Reconciliation of the existing live release plan was requested before writing the repair execution plan, per the user's AGENTS.md rule.
- **RELEASE BUG in published 0.1.0-next.1 (found 24/09/2026, not yet fixed):** in the interactive TUI, every second message fails with Groq `'messages.2' … property 'reasoning_content' is unsupported`. The first gpt-oss reply is stored as `assistant[thinking,text]`, and the next request sends that thinking back as `reasoning_content`, which Groq rejects. User session `1790192550166_urf3r` (gpt-oss-120b) shows this, as do the 20b sessions. It is not caused by the rate limit. Single-prompt runs and tool loops are unaffected. Suspect the `@ai-sdk/openai-compatible` (^3.0.27) message conversion or `sdk/packages/llms/src/providers/routing/portable-reasoning.ts`; not yet diagnosed. `--id` resume needs a TTY, so reproduce with a PTY test (extend the installed model/render PTY fixture to a 2-turn exchange where the fixture rejects `reasoning_content`). Also found: `/model` lists models.dev Groq entries that this key cannot access (e.g. `qwen/qwen3.6-27b`, `llama-3.3-70b-versatile`); only `use-model-selector.tsx:370` custom providers query `/models`. Working models on this key: gpt-oss-120b, gpt-oss-20b, qwen/qwen3.8-27b. `allam-2-7b` fails because Shri sends `reasoning_effort`. Caution: running `-m` tests while the user has a live TUI open changes their saved model under them.
- Trusted publishing: the user reports (24/09/2026) configuring GitHub Actions trusted publishers on npmjs.com for both packages (`shrinivas-sn` / `shri-harness` / `release.yml`, no environment, direct `npm publish` allowed), plus the optional publishing-access hardening. There is no CLI to read this back, so it is unverified until the first `release.yml` run with `publish=true` (next prerelease). If that run fails at publish, check these settings first.
- Follow-ups found during release: `-m` persists as the saved default model even though help says "for the session"; no on-screen notice while Groq rate-limit retries wait ~30s; `shri hi` (bare word) is rejected as a command; one unexplained ~90s pre-session hang with `-m openai/gpt-oss-20b` (never reproduced, no session or log lines created). Hosted Windows runners can exceed the 15s/20s test timeouts under load.
- The broad CLI `bun run test:unit` was rerun and interrupted after several minutes without progress, so no broad pass is claimed. It reported failures in inherited doctor, kanban, plugin, connector, and core prompt tests. Focused diagnosis found the three prompt failures were a real Windows drive-path mention bug; the regex correction passed all 5 prompt tests after failing first. The doctor sidecar test assumes POSIX `pgrep` although production intentionally skips that scan on Windows. Kanban tests use POSIX-style command shims that fail to resolve `npm.cmd` on Windows. Plugin/connector failures and the hang remain to classify; none are silently marked green. Earlier source-level tuistory `/settings` also stalled and was interrupted.
- Resolved: hosted Windows cleanup blocker (root cause and evidence in PLAN.md Progress Log). Fix `1010f25` — hosted Windows CI run `35877150073` passed 3/3 consecutive attempts (full build, typecheck, focused suite, packaging, tarball verification, installed E2E 8/8 with no-hub checks). Release blocker resolved: `createCliCore` (`apps/cli/src/session/session.ts`) maps default/`auto` backend to `local`, so the preview never prewarms a detached hub. Explicit `hub`/`remote` and an explicit `CLINE_SESSION_BACKEND_MODE` stay opt-in. The installed smoke now fails (`tui-left-hub`/`render-left-hub`) if a TUI leaves hub discovery, instead of silently stopping it. Verified locally: session tests 13/13; focused suite 39 files / 316 passed, 1 skipped; typecheck clean; biome clean; full local build → package → verify → installed E2E 8/8. Hosted CI must still pass repeatedly.
- Continue in `E:\shri-harness` on `main`. Preserve unrelated changes and use the command-scoped GitHub CLI HTTPS helper for this repo because default SSH authenticates as `shrinivas-work`.

## Reference documentation
- `RESEARCH/chat-model-errors.md`: 24/09 source trace and controlled second-turn adapter reproduction; no code fix yet.
- `CONTEXT/ROADMAP.md`: detailed proposed features, customization and acceptance criteria, separate from current repair scope.
- `PLAN.md` Tasks 8–12: user-approved extension location for the chat/model repair; supersedes the older release-task resume order, with implementation not yet started.
- `PLAN.md`: Node launcher plus embedded-Bun executable distribution for `@shrinivas-sn/shri@next`.
- `WORK/2026-09-22/WORK.md`, “Final static review and Terra handoff”: source locations, plan assessment, auth acceptance details and verification limits.
- `WORK/2026-09-22/npm-packaging-reference-superseded.md`: Original packaging reference preserved for history; its Node-runtime recommendation and direct-publish instructions are superseded.

## Next up (start here)
Current resume after 24/09/2026 diagnosis/planning: the user chose to extend `PLAN.md`; Tasks 8–12 now contain the detailed repair and release sequence. Start Task 8 when implementation is requested. The plan-location question is resolved. Diagnosis and roadmap are saved; application code remains unchanged.

1. The Windows preview `0.1.0-next.1` is live on npm, but second messages in the TUI fail (see the first Pending item). FIX FIRST: reproduce in a 2-turn PTY test, fix, and ship `0.1.0-next.2` as the first trusted-publishing release, together with filtering `/model` by the key's `/models`. Then: prove trusted publishing with the next prerelease (`publish=true`), and choose between the follow-ups (rate-limit notice, `-m` persistence, smaller per-turn prompt) and the deferred real multi-agent work. Linux/macOS stay deferred.

