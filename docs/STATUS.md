# Project status

Single running log — update in place each session, don't fork new files or append without pruning stale lines. This is the primary source `/recap` reads for "where things stand."

## Current state — as of 23/09/2026
- The interactive Shri CLI uses the existing Cline execution engine with Groq `openai/gpt-oss-120b`; prior user-run live inference is recorded in `WORK/2026-09-22/WORK.md`.
- Normal CLI configuration defaults to `~/.shri`; Task 1 now resolves and propagates the Shri storage environment before normal CLI, daemon, and ACP runtime access. Installed child/daemon proof remains Task 5.
- Task 1 source verification: `bun -F @cline/cli test:unit src/shri/ src/commands/update.test.ts src/commands/auth.test.ts src/main.test.ts` passed 15 files / 153 tests. CLI typecheck now passes. This does not prove installed-package behavior.
- The custom `shri:pipeline` has scaffolding and simulated execution; its reported run record is not written to disk. Real custom multi-agent execution is deferred.
- Task 2 produced a fresh Windows terminal artifact: `bun run build:sdk` and `bun run build:platforms:single` passed; `dist/cli-windows-x64/bin/cline.exe --version` returned `0.1.0-next.0`. No release artifact or npm installation has passed acceptance yet.
- User approved planning a single-agent npm preview first, with real multi-agent functionality afterward.
- `PLAN.md` is the canonical revised execution plan. Task 0 has a source fix and regression; no package was published.
- Task 0 is complete: `/model` has a real-renderer regression and Windows proof for opening, search, selection, Off, prompt return, Escape/cancel and reopen. Zero-token transcription rows are filtered/guarded; Groq Off omits unsupported `"none"` and hides GPT-OSS reasoning output. Installed-artifact repetition remains Task 5.
- Task 1 is complete at source level. Bare `shri auth` replaces saved keys with masked guidance/cancellation safety; startup tests cover command-line > environment > saved precedence without persisting temporary overrides. The source package is private/Shri-preview identified, automatic updates are disabled, and the telemetry handle is no-op. Installed-package proof remains Task 5.
- Task 2 is complete. Terminal builds default to no Hub webview, use native staging/cleanup APIs, reject unsupported build flags, and omit telemetry/OTEL build-time injection. The dashboard command fails safely when its opt-in assets are absent; the fresh executable contains only its binary, platform manifest, and plugin bootstrap. Task 4 repeats this artifact inspection for generated npm tarballs.
- Task 3 foundation is ready for review: fixture-tested scoped package generation and a Node-only Shri launcher preserve exit status and wrapper identity. It is not wired to production scripts yet, has not generated real cross-platform packages, and has not replaced the inherited CA/postinstall paths.

## Pending
- Continue Task 3: wire the Shri generator/launcher into package scripts, complete its platform-resolution and CA-state tests, then generate real packages from explicit artifacts. Task 5 still repeats Tasks 0–1 through installed artifacts.
- Confirm destination GitHub repository before release workflow setup; no remote was configured when inspected.
- Public npm publication requires explicit approval after concrete artifacts and verification are reviewable.
- Resume in `E:\shri-harness` on existing branch `main`, using GPT-5.6 Terra / high selected by the user. Preserve unrelated changes; current work includes the completed Task 0 source fixes/regressions and evidence record.

## Reference documentation
- `PLAN.md`: Node launcher plus embedded-Bun executable distribution for `@shrinivas-sn/shri@next`.
- `WORK/2026-09-22/WORK.md`, “Final static review and Terra handoff”: source locations, plan assessment, auth acceptance details and verification limits.
- `WORK/2026-09-22/npm-packaging-reference-superseded.md`: Original packaging reference preserved for history; its Node-runtime recommendation and direct-publish instructions are superseded.

## Next up (start here)
1. Continue Task 3 in `PLAN.md`: finish and verify local-only Shri packages and the Node launcher, without publishing.
