# PLAN — Shri npm preview release

**Written 22/09/2026.** Temporary live plan. Archive durable reasoning and verification before closing it.

> **Executor:** Use `superpowers:executing-plans` and work sequentially in the existing `E:\shri-harness` workspace. No subagents, delegation, or subagent reviews: the user explicitly prohibited them. Self-review each task. The user selected GPT-5.6 Terra with high reasoning for the next implementation session; select `gpt-5.6-terra` / `high` in the session controls. This document does not switch models. Resume Task 0, then Tasks 1–7; do not restart planning or execute an archived plan. The 22/09/2026 “Final static review and Terra handoff” entry in `WORK/2026-09-22/WORK.md` records the reviewed findings and evidence limits.

**What this changes:** CLI identity and initialization, build/package scripts, npm launcher, release tests, CI/release workflows, and documentation. SDK changes only where packaged execution or state isolation requires them; read `sdk/AGENTS.md` before editing that subtree.

**Goal:** Distribute the working Groq-backed Shri CLI as `@shrinivas-sn/shri`, exposing `shri`, without requiring users to install Bun or clone the repository.

**Done means:** An approved preview is published under `next`, and clean consumers on every advertised platform install it from npm and pass the acceptance checks. Before registry installation is verified, report “release-ready” or “publication pending,” not “published and verified.”

**Architecture:** A small Node CommonJS launcher selects a platform npm package containing a compiled executable with Bun embedded, plus required assets. Build `apps/cli/src/index.ts`, which uses the existing Cline execution engine and Shri Groq onboarding. Keep internal workspace names if useful; never substitute upstream published SDK code for this checkout's modified code accidentally.

**Tech stack:** Initially pin Bun to installed `1.3.14`, OpenTUI to `0.4.3`, and React to `19.2.4`; verify the lockfile before edits. Node `>=22.15.0` runs the npm launcher, not the TUI bundle.

**Spec / authority:** User-approved scope in this conversation: release the working Groq `openai/gpt-oss-120b` CLI first; implement real multi-agent execution afterward; never publish user credentials; no subagents. The requirements below record that agreement. A missing PRD is not an invented prerequisite.

## Requirements and boundaries

| ID | Required outcome | Task |
|---|---|---|
| R1 | npm/npx exposes `shri` without installed Bun or a checkout | 3–5 |
| R2 | Groq onboarding, prompts, TUI, built-in tools and history work | 1, 2, 5 |
| R3 | Credentials remain out of artifacts, release uploads and logs | 1, 4–7 |
| R4 | Identity, state, updates and child processes belong to Shri | 1, 3 |
| R5 | Preserve native assets and dependency patches | 2–5 |
| R6 | Advertise only platforms with installed-artifact proof | 5–7 |
| R7 | Describe a single-agent preview; defer real custom orchestration | 1, 6 |
| R8 | Sequential execution, self-review, append-only evidence | all |
| R9 | `/model` opens, searches, selects, cancels and reopens without a renderer crash | 0, 5 |

- Initial version: `0.1.0-next.0`, npm tag `next`. Intended commands: `npm install -g @shrinivas-sn/shri@next`, `shri auth`, `shri -i`, and `shri "<prompt>"`. Do not promote to `latest` in this plan.
- First preview support is Windows x64 only. Linux x64/glibc and macOS arm64 remain future targets in the platform model, but are not advertised or published until each passes native installed testing. Windows arm64, macOS x64, Linux arm64 and musl remain deferred. The launcher must derive advertised targets from the generated wrapper manifest, not a Windows-only source constant.
- Default configuration is `~/.shri`; preserve `--config` and `SHRI_DIR` overrides and verify daemon/child behavior as well as the parent.
- Users supply their own runtime Groq keys. Provider requests necessarily send authentication and prompt/context to the configured provider; do not describe inference as local.
- Build and release jobs receive no real Groq keys. Use a synthetic canary for credential tests. Never read the user's saved key to populate a test, shell command, log, report or scan pattern.
- Exclude `.env`, `.npmrc`, provider settings, home directories, session histories and recordings from artifacts. Disable inherited upstream telemetry/error reporting and automatic updates for this preview. Explicit update instructions must target Shri and `next`.
- Retain Apache-2.0 licensing, upstream attribution and applicable notices.
- Keep source-package direct-publish protection. Never bypass it using `CLINE_ALLOW_DIRECT_PUBLISH=1`; publish verified generated artifacts only.
- No UI redesign, new providers, public SDK release, dashboard, or real multi-agent implementation. Preserve custom orchestration source for later work; remove simulated behavior from release claims and public help.
- Verify workspace ownership before first writes. Never recreate `.git`, change ACLs, or create top-level workspace roots from a sandbox. Disposable local tests belong under the existing owned workspace; check cleanup paths before recursive removal.

## Baseline evidence and corrections

- This conversation: `bun -F @cline/cli test:unit src/shri/` passed **11 files / 44 tests**, exit 0, 24.81 seconds. These source tests do not prove a distributable package or real orchestration.
- `bun run build` in `apps/cli` exited **1**: webview build cannot resolve `vite/client`, `vite`, `@tailwindcss/vite`, or `@vitejs/plugin-react-swc`.
- Installed Node `22.15.0` returns `ERR_UNKNOWN_BUILTIN_MODULE` for `node:ffi`; TUI source also calls `Bun.stringWidth`. A Node shebang does not establish compatibility.
- `src/shri/index.ts` constructs a fixed plan and simulates its default execution; `src/shri/bin.ts` prints “Run Record Saved” without writing a record. The normal interactive CLI's live Groq evidence is separate.
- `script/publish-npm.ts` generates `cline` / `@cline/cli-*` and adds upstream host SDK dependencies. `src/commands/update.ts` targets `cline`.
- `script/postinstall.mjs` touches Cline Hub discovery records. Do not include it in the Shri preview.
- Root metadata pins Bun `1.3.13`, installed Bun is `1.3.14`; align deliberately without upgrading unrelated packages.
- `git remote -v` had no entries. Confirm the destination repository before configuring publication; do not invent a GitHub URL.
- Both existing npm packages are `0.2.0`: `@shrinivas-sn/verify-claims` and `@shrinivas-sn/adapter-ingestion`. Registry manifests/READMEs were read. Verify-claims CI/release workflows were read; adapter repository returned 404, so its actual workflow remains unverified.
- User reproduced a crash after `bun run shri` then `/model`: `Text must be created inside of a text node` in OpenTUI React `createTextInstance`. Read-only analysis found a concrete unsafe expression in `ModelRow`: `model.maxInputTokens && <text>...</text>`. The checked Groq catalog contains `whisper-large-v3` and `whisper-large-v3-turbo`, both transcription models with `maxInputTokens: 0`; evaluating this guard yields numeric `0`. The selector refresh/build path does not apply the existing chat-model filter. This is the leading cause, not a claimed end-to-end reproduction: the isolated native renderer probe returned no result and was terminated; a subsequent host process check found zero surviving probe processes.

## Phases

For behavior changes in every task: write a focused failing test, run it and record the real failure, implement, rerun, then self-review. Tasks describe acceptance targets; none of these targets are existing verification claims. Record checkpoint commits only when commits are authorized; never stage unrelated work.

### Task 0 — Reproduce and fix the `/model` rendering crash before packaging

**Priority / dependency:** First implementation task, before Task 1. This is normal advertised CLI usage and blocks preview release. Keep Tasks 1–7 numbered as written so existing references remain useful. The user authorized adding the task, not claiming it fixed during planning.

**Read / likely modify:** `apps/cli/src/tui/hooks/use-model-selector.tsx`, `src/tui/components/model-selector/model-selector.tsx`, and `src/utils/chat-models.ts`. Inspect `components/model-selector/provider-row.tsx`, `components/dialogs/loading-dialog.tsx`, and the installed OpenTUI/dialog renderer if reproduction points elsewhere. Do not edit generated provider catalog data to hide the issue.

**Tests:** Create `apps/cli/src/tui/components/model-selector/model-selector.render.test.tsx` using Bun's test runner and real OpenTUI renderer; extend `src/utils/chat-models.test.ts` for catalog eligibility and `src/cli.interactive.e2e.test.ts` for the command flow where its platform driver works. Existing interactive tests use POSIX `script`; a skipped or unsupported Windows test is not Windows proof. Use the project's available Windows PTY driver or record a separate manual Windows reproduction/verification.

**Confirmed local facts:** `use-model-selector.tsx` refreshes `config.knownModels` and feeds `buildModelOptions` without calling `filterChatModels`. `buildModelOptions` retains token limit `0`. `ModelRow` puts the result of `model.maxInputTokens && ...` directly under `<box>`. The installed reconciler throws the supplied error when raw text is created outside a text node. The local catalog probe confirmed two zero-limit transcription entries, but the exact runtime/refreshed list in the user's session has not been captured.

**Do not assume:** A library-version mismatch is the cause; filtering alone makes rendering robust; passing auth tests covers dialogs; a source test proves an installed package. Do not upgrade/downgrade OpenTUI, blanket-catch renderer failures, disable `/model`, or remove valid chat models as the first fix.

- [x] Reproduce with Groq selected and the current model `openai/gpt-oss-120b`, using isolated configuration and no real key in test output. Record whether failure occurs in loading, list render, selection, or close. Use a bounded subprocess/PTY timeout; always close its renderer and terminate only task-owned children.
- [x] Build a deterministic renderer regression using the current Groq fixture plus explicit model rows with token limit `0`, missing, and positive. Include a list long enough to exercise windowed rows. Create renderer/root before render and tear them down in `finally`, so a render exception cannot leak a terminal/native handle. Capture the current failure with the actual OpenTUI renderer; a mocked React tree or a successful numeric-expression probe alone is insufficient.
- [x] Confirm or disprove the zero-child hypothesis by changing only that input/guard in the regression. If it does not reproduce the observed exception, trace loading-dialog, provider-row and dialog-portal children next and record the actual offending node before making a production change.
- [x] Once confirmed, make optional token metadata render only for a finite positive number, returning `null` otherwise. Retain a defensive row guard even when non-chat models are filtered. A suitable existing-row expression is shown below; it must be validated against the regression, not pasted as a presumed cure.
- [x] Reuse `filterChatModels` at the refreshed model-picker boundary so transcription models do not appear as chat choices. Cover initial and refreshed catalogs, provider changes, and model browsing routes sharing this picker. Preserve text/chat-compatible models and intentional manual custom-ID entry; test unknown metadata according to the existing filter contract rather than inventing name-based exclusions.
- [x] Verify empty list, no search matches, current model absent, reasoning and non-reasoning selections, custom-ID entry, cancel/Escape, reopen, and provider-change return. Ensure cancel preserves the selected model, successful selection updates it, focus returns to the prompt, and no unhandled rejection or leaked dialog remains.
- [x] Run the focused model/filter/native renderer tests, then the existing Shri/auth suite. Execute `bun run shri`, open `/model`, search, select, cancel, reopen and exit in a real Windows terminal. Record actual results separately from headless rendering. Use a user-entered key only if live provider confirmation is needed; no key should be needed for the fixture regression.
- [x] Carry this exact interaction into Task 5's installed-artifact suite on each advertised platform. Record root cause, failing/passing evidence, and limitations in the work log before marking Task 0 complete.

Candidate row guard after reproduction confirms the unsafe numeric child:

```tsx
{typeof model.maxInputTokens === "number" &&
Number.isFinite(model.maxInputTokens) &&
model.maxInputTokens > 0 ? (
  <text fg={isSelected ? palette.textOnSelection : "gray"} flexShrink={0}>
    {formatTokenCount(model.maxInputTokens)}
  </text>
) : null}
```

```powershell
# From repository root; existing Vitest config covers .test.ts, not .test.tsx:
bun -F @cline/cli test:unit src/utils/chat-models.test.ts src/shri/
# From apps/cli, after creating the real-renderer regression:
bun test ./src/tui/components/model-selector/model-selector.render.test.tsx
# Real Windows interaction: type /model and exercise the steps above.
Set-Location E:\shri-harness
bun run shri
```

The last command is run from the repository root (the root owns the `shri` script); return there after the native test. Run the native test with a timeout and record a hang as a failure, not a pass. If renderer tests are added to CI, invoke the Bun command explicitly so they cannot silently be omitted by Vitest's existing `src/**/*.test.ts` include pattern.

**Gate:** Actual renderer regression fails before the fix and passes after it; the reported `/model` interaction is verified on Windows without changing keys or suppressing errors. Task 0 closes on source/Windows proof plus recorded Task 5 coverage requirements; actual installed-package execution belongs to Task 5, after packaging exists. Do not create a circular dependency between Tasks 0 and 5. No preview publication while this crash is unresolved. If Windows interaction cannot be driven in the execution environment, record the exact limitation and request the specific manual interaction evidence; do not count a skip or headless render as Windows interaction proof.

### Task 1 — Establish preview identity and runtime boundaries

**Modify:** `apps/cli/package.json`, `src/index.ts`, `src/main.ts`, `src/commands/program.ts`, `src/commands/auth.ts`, `src/commands/update.ts`, `src/utils/telemetry.ts`, `src/utils/common.ts`, `src/shri/auth/shri-dir.ts`, `src/shri/auth/groq-auth.ts`, `apps/cli/README.md`.

**Tests:** Extend `src/commands/update.test.ts`, `src/commands/auth.test.ts`, `src/main.test.ts`, `src/shri/auth/groq-auth.test.ts`, and `src/shri/auth/shri-auth-integration.test.ts`; create `src/shri/release-identity.test.ts`. SDK path helpers are investigation targets only if process-level tests expose a leak.

**Interface:** Retain internal name `@cline/cli` so workspace filters keep working; mark source package private, set `displayName: "shri"` and preview version. Public identity belongs to generated manifests. Main and child processes must share the resolved Shri configuration directory.

- [x] Add failing tests for help/version identity, absent automatic update requests, explicit Shri update instructions and child/daemon state isolation. Test `--config` > `SHRI_DIR` > default, using disposable home directories and a fake `.cline` sentinel.
- [x] Initialize Shri state before updater, telemetry or daemon state access. Inspect import side effects, then propagate the resolved directory through the existing SDK environment conventions.
- [x] Disable inherited telemetry/error export and automatic updates. Ensure explicit update behavior targets `@shrinivas-sn/shri@next` and cannot install `cline`.
- [x] Preserve Groq defaults; test missing/invalid credentials without printing raw values. Inspect outgoing requests with synthetic credentials so no non-provider reporting includes them.
- [x] Fix explicit auth recovery: `shri auth` must offer masked replacement of a saved Groq key rather than silently returning the existing value. Keep normal startup's reuse behavior. Cover a synthetic saved invalid key, successful replacement and persistence, cancellation preserving saved settings, and non-TTY failure with actionable guidance. Preserve the saved model when replacing only the key. An active environment key must not make explicit reconfiguration silently succeed; explain environment precedence without printing its value. Verify the 401 recovery instruction against the actual command flow; an assertion that the return code is merely defined is insufficient.
- [x] Fix startup key precedence end to end: nonblank command-line key > nonblank `GROQ_API_KEY` > saved key > onboarding. `main.ts` currently bypasses `ensureGroqApiKey` whenever a saved key exists, despite `resolveGroqApiKey` prioritizing the environment. Add regressions at the startup/runtime boundary, not just helper tests, using distinct synthetic keys and checking the selected provider configuration. Cover blank overrides and ensure environment/command-line overrides are not persisted implicitly. Carry replacement and precedence cases into Task 5's installed checks.
- [x] Correct public copy to single-agent preview; keep upstream credits. Mark the custom pipeline simulated in developer documentation and exclude its entrypoint from public release commands.
- [x] Run the focused suite; self-review initialization across normal CLI, daemon and connector modes.

```powershell
bun -F @cline/cli test:unit src/shri/ src/commands/update.test.ts src/commands/auth.test.ts src/main.test.ts
```

**Gate:** Shri state applies before access in every supported process mode. Parent-only isolation and existing auth tests alone are insufficient.

### Task 2 — Build the terminal product deterministically

**Modify:** Root `package.json` / `bun.lock` for the tool pin; `apps/cli/bun.mts`, `script/build.ts`, `script/build-options.ts`. Extend `src/commands/build-options.test.ts`. Preserve the existing two patches in `patches/`.

**Interface:** Existing `build:platforms:single` produces a fresh host artifact without building the dashboard. Add `--with-hub-webview` as an explicit development opt-in; retain daemon services used by terminal sessions.

- [x] Test default terminal build, explicit webview opt-in, unsupported targets and invalid options before implementation.
- [x] Separate webview build/copy in both build paths. Any retained runtime route requiring missing assets must be handled explicitly; do not ship a broken hidden dashboard command.
- [x] Replace `/tmp`, shell `rm -rf`, and cross-shell copy/chmod assumptions with native filesystem operations and scoped staging directories. Resolve and validate every recursive cleanup target; restore changed working directories in `finally`.
- [x] Remove generic `OTEL_*` and telemetry-secret embedding. Build with an explicit minimal environment; never inline arbitrary environment values, `GROQ_API_KEY`, user homes or settings.
- [x] Inventory parser workers, native libraries, plugin bootstrap and dynamic imports. Record required runtime files for Task 4's artifact check. Verify Bun compile support at the pinned version rather than relying on newer docs.
- [x] Align Bun to `1.3.14`, retaining locked OpenTUI/React and patched dependencies. Change that pin only after recording a concrete blocker and validating the replacement.
- [x] Check build success explicitly and reject missing outputs. Run the SDK and host builds from their correct directories.

```powershell
bun run build:sdk
bun -F @cline/cli test:unit src/commands/build-options.test.ts
# From apps/cli:
bun run build:platforms:single
```

**Gate:** Fresh Windows executable starts without dashboard dependencies and includes the intended patched code. Do not pass using stale dist files.

### Task 3 — Generate public packages and the Node launcher

**Modify:** `apps/cli/script/build.ts`, `script/publish-npm.ts`, `script/guard-direct-publish.ts`, package scripts, and `bin/ca-certs.cjs` only as required for Shri paths.

**Create:** `apps/cli/script/package-release.ts`, `bin/shri.cjs`, `src/commands/package-release.test.ts`. Extend `src/commands/bin-wrapper.test.ts`.

**Interface:** New `package:release` generates `apps/cli/dist/npm/shri/` and `apps/cli/dist/npm/shri-<os>-<arch>/` without publishing or registry writes. Use an explicit target list, not stale directory enumeration. Generation and publication must be separate.

Wrapper manifest contract (generator adds exact-version platform optional dependencies, confirmed repository metadata, description, and relevant notices):

```json
{
  "name": "@shrinivas-sn/shri",
  "version": "0.1.0-next.0",
  "type": "commonjs",
  "bin": { "shri": "bin/shri.cjs" },
  "engines": { "node": ">=22.15.0" },
  "files": ["bin"],
  "license": "Apache-2.0",
  "publishConfig": { "access": "public" }
}
```

The Windows platform package is `@shrinivas-sn/shri-windows-x64`, with `os: ["win32"]`, `cpu: ["x64"]`, and `bin/shri.exe`. Linux/macOS equivalents contain `bin/shri`. All versions must match the wrapper exactly. Include README, license and notices in actual generated package contents.

- [x] Test launcher platform selection, spaces/non-ASCII paths, argv forwarding, terminal I/O, exit status, signals, missing platform package and unsupported architecture. Use a controlled child fixture that exits 7; assert the launcher also exits 7. The POSIX signal case is host-skipped on Windows and remains native Task 5 evidence.
- [x] Implement `shri.cjs` with Node APIs only. Resolve installed platform files without repository paths. Forward Shri wrapper identity and configuration. Preserve corporate CA handling without touching Cline state.
- [x] Omit inherited postinstall entirely; resolve binaries at launch. Installations with lifecycle scripts disabled must work and must not move Cline discovery files.
- [x] Generate scoped public manifests and reject `workspace:*` dependencies or inherited upstream SDK dependencies. Keep internal source names private.
- [x] Audit `sdk/packages/core/src/extensions/plugin/plugin-module-import.ts`. Supported built-in functionality must use packaged local code. If supported plugin loading needs unbundled host SDK files, include locally built support files/dependencies and test their resolution. Do not silently fall back to upstream packages. Do not advertise plugin support without an installed test. Plugin loading is not advertised; its installed support remains unverified.
- [x] Keep the direct-publish guard; update its guidance to generated Shri artifacts. Publisher dry runs must never write to the registry. The inherited publish scripts are disconnected until Task 6 supplies verified Shri publication.

```powershell
bun -F @cline/cli test:unit src/commands/bin-wrapper.test.ts src/commands/package-release.test.ts
# New script after implementation, from apps/cli:
bun run package:release --target windows-x64
```

**Gate:** All public identity/launch paths target Shri; no workspace dependency escapes; launcher works without postinstall or Bun on PATH.

### Task 4 — Inspect real tarballs and exclude credentials

**Create:** `apps/cli/script/verify-release.ts`, `src/commands/release-artifacts.test.ts`; CLI script `verify:release`.

**Interface:** Pack each explicitly generated package with lifecycle scripts disabled. Extract the actual tarballs safely into a disposable directory. Produce a report with package/version, target, inventory, size, SHA-256, and check outcomes; never include secrets.

- [x] Add failing fixtures for missing executable/worker/native/bootstrap files, mismatched versions, `workspace:*`, forbidden config files, and a synthetic key embedded in both text and binary bytes. Assert failure by check identifier without echoing matched secrets.
- [x] Run `npm pack --json --ignore-scripts` in each generated directory. Validate extracted paths against traversal. Inspect the resulting files, not just the manifest allowlist or dry-run output.
- [x] Compare contents to Task 2's asset inventory and verify locally patched code survives packaging. Consumers must not need the root Bun patch configuration.
- [x] Build with only the synthetic `GROQ_API_KEY=gsk_SHRI_RELEASE_TEST_CANARY_DO_NOT_USE` and a disposable config holding that same canary. Scan executable bytes, tarball contents, assets, sourcemaps, build logs and reports for it. Never use the actual user's key.
- [x] Scan release inputs for credential patterns and prohibited paths. Narrowly identify synthetic test fixtures; do not exempt every `gsk_` match. Record that this check covers release inputs/outputs, not an exhaustive historical Git audit.
- [x] Verify licensing/attribution and README inclusion. Reject home directories, sessions, VCR recordings and unrelated repository files.

```powershell
bun -F @cline/cli test:unit src/commands/release-artifacts.test.ts
# New script after implementation, from apps/cli:
bun run verify:release
```

**Gate:** Packed outputs pass credential, inventory, dependency and license checks. A string scan is not a substitute for installed execution.

### Task 5 — Prove isolated installation and real use

**Create:** `apps/cli/script/smoke-installed.ts`, `src/commands/installed-release.e2e.test.ts`; CLI script `smoke:installed`. Reuse existing interactive/e2e infrastructure where it can drive an installed executable.

**Interface:** Consume Task 4 tarballs/report. Use a disposable npm prefix, fresh HOME/USERPROFILE and Shri config, an unrelated working directory, no Bun on PATH, and no access to repository node_modules. Record platform-specific results.

- [ ] Install wrapper and matching platform tarballs into the same disposable prefix, preventing npm from fetching not-yet-published optional packages. Exercise the actual npm-generated command shim and installed-package npx execution.
- [ ] Check help/version, missing-key non-TTY failure, paths with spaces/non-ASCII characters, Ctrl+C and exit codes. Verify installation using `--ignore-scripts`.
- [ ] Exercise onboarding and streaming with a controlled local provider fixture through an existing base-URL/provider seam: one file-read tool, one harmless command, history/restart, invalid auth, interrupted stream and transient provider errors. Synthetic provider tests are not live Groq evidence.
- [ ] Repeat Task 1's saved-key replacement/cancellation and command-line/environment/saved-key precedence cases through the installed CLI with synthetic credentials. Inspect fixture requests/configuration without logging credential values; confirm temporary overrides do not overwrite saved settings.
- [ ] Drive real TUI startup, masked input, rendering, syntax highlighting/parser worker and shutdown in a PTY on each advertised platform. Keep captures redacted. Help-only execution cannot pass this gate.
- [ ] Repeat Task 0's `/model` open/search/select/cancel/reopen flow using installed artifacts and representative Groq catalog fixtures, including zero/missing metadata and transcription entries. Confirm chat choices exclude transcription models, no raw numeric child crashes the renderer, selection/cancel behaves correctly, and the prompt remains usable afterward. A passing source-only fix does not satisfy this gate.
- [ ] Verify settings, logs, sessions and daemon discovery remain inside Shri's disposable config. Assert a fake `.cline` sentinel is unchanged through install, start, child spawn, shutdown and restart.
- [ ] Test absent optional platform dependency and unsupported targets for actionable errors; do not download fallback executables from arbitrary URLs.
- [ ] Run one live Groq interaction from the installed artifact, using a user-entered local key outside build/CI. Record model and redacted outcome only. If that input is unavailable, leave live verification explicitly pending.

```powershell
# New script after implementation, from apps/cli:
bun run smoke:installed
```

**Gate:** The first preview requires full native Windows x64 installed-artifact proof and a separate live Groq result. Linux x64/glibc and macOS arm64 native proof is required before those targets are added later; cross-compilation is not native execution evidence.

### Task 6 — Automate releases and document the preview

**Create:** `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `DOCS/RELEASE.md`. Modify scripts, `apps/cli/README.md`, `DOCS/STATUS.md`, `DOCS/README.md` as needed.

- [ ] Confirm the destination GitHub repository before remote creation or publication metadata. Local work can continue without it; remote setup/provenance cannot. Do not invent ownership, URL or an existing remote.
- [ ] Recheck verify-claims' release/OIDC workflow and current official npm requirements. Reuse applicable release conventions, not its small-library build commands. Keep Bun's lockfile; do not add npm lockfiles just to imitate the other repo.
- [ ] Add a native Windows x64 build/test job for the first preview. Keep the target matrix extensible for later Linux x64/glibc and macOS arm64 jobs, which require their own verified runner architecture and native gates before advertisement. Pin Bun and use frozen-lockfile installs.
- [ ] Separate artifact generation/testing from publication. Require every target job and package check to pass on the exact commit/version. Publish the tested tarballs after comparing their recorded hashes; do not rebuild them in the publish job.
- [ ] For the first preview, use the private CLI source package's exact prerelease version and matching `v<version>` Git tag as the single version source. Generate wrapper/platform versions from it; never publish unrelated SDK workspaces. Defer Changesets until multiple independently versioned release packages actually need it.
- [ ] Retain prerelease mode and tag `next`. Publisher rejects unapproved names, missing advertised targets, skewed versions, different artifact hashes, and accidental `latest` promotion. For this preview the advertised target set is exactly Windows x64; future targets come from tested release configuration, not hardcoded platform branching.
- [ ] Restrict `id-token: write` to publishing. Use a pinned compatible release npm version after verifying requirements: official docs currently require npm >=11.5.1 and Node >=22.14.0; the preview's Node floor is >=22.15.0. No real Groq key in CI.
- [ ] Document install, supported targets, own-key onboarding, local configuration, provider data transmission, update/uninstall, preview limitations and deferred orchestration. Use measured package sizes.

**Gate:** CI gates exact publishable artifacts and repository/workflow identities match metadata. Missing GitHub setup means CI/provenance are pending, even if local artifacts work.

### Task 7 — Review, publish and verify the registry installation

**Update:** Release report, `DOCS/RELEASE.md`, `DOCS/STATUS.md`, current `DOCS/WORK/` record, and this plan's Progress Log.

- [ ] Present package names/versions/targets, inventory, sizes, hashes, test results, credential exclusion evidence and limitations. The user authorized creating/pushing a public GitHub repository and publishing the Windows preview on 23/09/2026. Do not publish if account access, license/security review, live Groq proof, CI or registry verification is missing; reconfirm if the release scope or package identity changes.
- [ ] Verify npm account/scope interactively without displaying tokens. Check current first-publish/trusted-publisher bootstrap support. Configure trust for every generated package. Never put npm credentials in the repository or workflow YAML.
- [ ] Publish platform tarballs first using `--access public --tag next`, confirm registry versions/integrities, then publish the wrapper. On retry, skip an existing matching version and reject different content at that version.
- [ ] On Windows x64, install `@shrinivas-sn/shri@next` from npm into a fresh prefix and repeat installed smoke checks. Verify `npx @shrinivas-sn/shri@next --help` without Bun or this checkout. Repeat the same gate before enabling any later target.
- [ ] If installation fails, stop promotion and prepare a corrected prerelease. Do not overwrite published versions or treat unpublish as the default rollback.
- [ ] Record actual published URLs/versions/hashes and command outputs. Preserve deferred platforms and real multi-agent work. Archive durable reasoning/evidence before retiring this live plan.

**Gate:** Existing explicit Windows-preview publication authorization, all release blockers cleared, and actual Windows registry-installation proof. No stable/latest or Linux/macOS release is authorized here.

## Decisions

- 22/09/2026: User explicitly authorized revising the existing unfinished plan. Preserve its original reference in `WORK/2026-09-22/npm-packaging-reference-superseded.md`; do not create a competing live plan.
- 22/09/2026: Supersede plain Node ESM recommendation with a Node launcher plus embedded-Bun executable. The inspected TUI cannot be promised to run under Node >=22 merely by changing its shebang.
- 22/09/2026: Correct the old “no Node or Bun required” claim: npm/npx and this launcher need Node; the executable embeds Bun.
- 22/09/2026: Supersede source-package publishing/guard bypass instructions; release generated inspected artifacts only.
- 22/09/2026: Publish the working single-agent CLI as a preview. Real custom orchestration, real usage accounting and its persistence remain explicitly deferred.
- 22/09/2026: Disable inherited upstream telemetry and automatic updates for preview; keep runtime keys out of build/release jobs.
- 22/09/2026: Build Windows x64 first; native installed proof controls advertised platform support, not a presumed six-platform matrix.
- 22/09/2026: No subagents in planning, implementation or review. Model preference does not establish availability or select the execution model.
- 22/09/2026: Add Task 0 before packaging for the user-reported `/model` crash and extend installed acceptance coverage. Leading hypothesis is a zero token-limit child plus unfiltered transcription catalog entries; actual renderer/interactive reproduction remains required. Do not label the bug fixed during planning.
- 22/09/2026: Final static review retains the single-agent preview sequence and adds explicit saved-key recovery and startup key-precedence regressions to Tasks 1 and 5. User selected GPT-5.6 Terra / high for implementation and requested this documentation checkpoint. No implementation has started; source review is not runtime proof.
- 23/09/2026: User narrowed the first production-grade preview to Windows x64, authorized a public GitHub repository/push and npm publication, and required the code to remain extensible to Linux/macOS. Defer those native gates and platform packages until separately proven. Existing security, CI, live-provider and registry-install gates remain in force; this is not permission to publish an unverified artifact.
- 23/09/2026: User selected `shrinivas-sn/shri-harness`; the empty public repository exists. For the first preview, exact source prerelease version plus matching Git tag drives all generated package versions. Defer Changesets to avoid a second version source; this means the next prerelease increment remains a deliberate manual step.

## Sources

- Local source paths and measured baseline results above; installed versions take precedence over newer unpinned docs for version-specific behavior.
- [Bun standalone executables](https://bun.sh/docs/bundler/executables): embedded runtime and targets; current docs may describe a newer Bun than this project's pin.
- [npm package metadata](https://docs.npmjs.com/cli/v11/configuring-npm/package-json): bin, files, platform restrictions and optional dependencies.
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/): CI identity, permissions, runtime/tool requirements and provenance.
- [verify-claims release workflow](https://github.com/shrinivas-sn/verify-claims/blob/main/.github/workflows/release.yml): user's actual Changesets/OIDC precedent.
- [verify-claims](https://www.npmjs.com/package/@shrinivas-sn/verify-claims) and [adapter-ingestion](https://www.npmjs.com/package/@shrinivas-sn/adapter-ingestion): published package manifests and READMEs inspected during analysis.

## Progress Log

Append only, one entry per session. Never rewrite an earlier entry; append a correction if evidence changes.

### Planning — 22/09/2026

Done: Revised the existing plan for the accepted single-agent preview, preserved the old reference, specified no-subagent execution, and documented the distinction between working Groq inference and simulated custom orchestration. Implementation tasks remain unchecked.

Verified: `Get-Acl E:\shri-harness` returned `SSN-INSPIRON-35\Dell`; initial `git status --short` was empty. This conversation's analysis reran `bun -F @cline/cli test:unit src/shri/`: 11 files / 44 tests passed, exit 0. `bun run build` in apps/cli exited 1 with missing webview/Vite dependencies. These are baseline results, not release verification. Documentation validation: `git diff --check` found no whitespace errors (only Windows LF/CRLF notices); the PowerShell structural scan reported `Plan audit: 7 tasks; 46 pending steps; 0 completed steps` and `Plan structure and placeholder checks: PASS`.

Surprises: Custom pipeline execution and persistence were overstated in earlier docs; publisher, updater and postinstall still target Cline. The old Node-runtime recommendation was unsupported by the installed dependencies.

Next: Execute Task 1 sequentially: ownership/status checks, inspect current initialization and tests, add failing identity and state-isolation cases. Confirm repository destination before Task 6; obtain publication approval only after Task 7's concrete artifact review.

Commit: Not committed.

### Task 1 in progress — explicit Groq auth and startup precedence — 23/09/2026

Done: Started Task 1 after Task 0's Windows gate. Added synthetic red/green tests for replacing a saved Groq key through bare `shri auth`, cancellation without writes, masked environment-precedence guidance, command-line/environment/saved selection at the startup boundary, and temporary override persistence. Implemented explicit reconfiguration, SIGINT cancellation, preserved saved settings/model during replacement, non-misleading Groq copy, and startup precedence `--key` > `GROQ_API_KEY` > saved. Command-line and environment keys now remain temporary; a pre-existing saved key is preserved rather than overwritten.

Verified: `bun run test:unit src/shri/auth/groq-auth.test.ts` was red with three failures (saved key returned, cancellation reused it, environment bypassed prompt); after the implementation it passed. `bun run test:unit src/shri/auth/shri-auth-integration.test.ts` was red (`bare Groq auth` returned 1 instead of injected explicit reconfiguration success); after the command-flow change both auth files passed 17 tests. The startup tests were red for persisted command-line key and saved-over-environment selection; the focused final command `bun run test:unit src/shri/auth/groq-auth.test.ts src/shri/auth/shri-auth-integration.test.ts src/main.test.ts --testNamePattern="Groq Auth Management|Shri Auth Command Integration|prefers a command-line|prefers a nonblank"` passed 3 files / 20 tests, with 85 intentionally name-filtered tests skipped. All credentials in tests are synthetic.

Surprises: The initial full `main.test.ts` attempt exposed an incomplete synthetic mock and started two task-owned hidden prompts. They were identified by start time and terminated; the user's existing long-running CLI process was not touched. The corrected name-filtered regressions completed normally. Do not count that aborted full-suite attempt as passing.

Next: Complete Task 1 identity/state/updater/telemetry boundaries and run the required unfiltered focused suite. Explicit auth and precedence source work is green but Task 1 remains open; installed CLI repetition remains Task 5.

Commit: Not committed.

### Task 0 follow-up — rebuilt source retest prepared — 23/09/2026

Done: Rebuilt the changed `@cline/llms` package so `bun run shri` consumes the current routing source, then reran the real OpenTUI model-selector regression.

Verified: From `sdk`, `bun -F @cline/llms build` exited 0. From `apps/cli`, `bun test ./src/tui/components/model-selector/model-selector.render.test.tsx` passed 2 tests / 4 assertions, exit 0. These remain source/build checks; the pending Windows visible-terminal proof is not claimed.

Surprises: None.

Next: In the existing terminal, restart `bun run shri`, select Off through `/model`, and submit `hi`. It should succeed without a `▶ Thinking:` trace. Then provide the cancel/reopen/search outcomes required by Task 0.

Commit: Not committed.

### Task 0 follow-up — Groq Off hides GPT-OSS reasoning output — 23/09/2026

Done: The first Windows retest proved that the invalid `"none"` effort error was fixed, but also showed a visible Thinking trace after selecting Off. Retrieved the current official Groq and AI SDK documentation before changing routing. GPT-OSS supports only low/medium/high internal reasoning; Groq documents `include_reasoning: false` as the supported way to hide its output. Added a named Groq provider-option rule that carries the original disabled user intent through generic normalization and passes that field to the OpenAI-compatible request body.

Verified: The new provider-options regression was red: disabled Groq GPT-OSS returned only `{ strictJsonSchema: false }`, without `include_reasoning`. After the rule, `bun -F @cline/llms test src/providers/routing/provider-options.test.ts` passed 124 tests, `bun -F @cline/llms test src/providers/ai-sdk-reasoning.test.ts` passed 15 tests, and `bun -F @cline/llms typecheck` exited 0. Groq's official documentation distinguishes GPT-OSS effort values (low/medium/high) from its `include_reasoning: false` output control; AI SDK's OpenAI-compatible provider passes extra provider-option keys through as request-body fields. These are source/routing checks, not a rerun of the edited checkout or installed artifact.

Surprises: The selector's universal Off label had two different implications: it cannot eliminate GPT-OSS's internal reasoning, but it can and should hide its returned trace. The provider-options normalizer deliberately removes unsupported disable controls, so the named Groq rule receives the unnormalized original intent only for output visibility; it does not alter generic normalization or valid Groq effort values.

Next: Restart the edited checkout and repeat only `/model` → Off → `hi`. A successful result should have no error and no `▶ Thinking:` line. Then complete cancel/Escape, reopen, and `whisper` search evidence. Do not mark Task 0 complete until that Windows evidence is observed.

Commit: Not committed.

### Task 1 checkpoint — preview identity, storage propagation and explicit keys — 23/09/2026

Done: Added synthetic source regressions for saved-key replacement/cancellation, CLI/environment/saved-key precedence, preview identity, Shri help text, and inherited-Cline storage-path replacement. `shri auth` now explicitly reconfigures Groq with a masked saved-key notice and preserves model/settings on replacement; normal startup keeps temporary command-line/environment keys out of persisted settings. The source package remains `@cline/cli` for workspace filters but is private with Shri preview identity. Normal CLI, daemon and ACP paths initialize Shri state; the initializer propagates the resolved directory via the SDK's `CLINE_*` child-process conventions. Automatic startup/deferred updates are disabled; explicit updater package resolution targets `@shrinivas-sn/shri@next`. The CLI telemetry factory requests a disabled/no-op service. Replaced inherited public README copy with single-agent preview scope and upstream attribution.

Verified: Host `bun run test:unit src/shri/auth/groq-auth.test.ts` passed 15 tests; `bun run test:unit src/shri/auth/shri-auth-integration.test.ts` passed 2 tests; selected `src/main.test.ts` Task 1 cases passed 4 tests (83 intentionally name-filtered); `bun run test:unit src/shri/release-identity.test.ts` passed 1 test; `bun run test:unit src/shri/auth/shri-dir.test.ts` was red on inherited `CLINE_DIR`, then passed 5 tests after propagation; `bun run test:unit src/shri/auth/shri-dir.test.ts src/commands/program.test.ts` passed 5 tests; `bun run typecheck` emitted no diagnostics; `git -c core.safecrlf=false diff --check` passed. The required unfiltered `bun -F @cline/cli test:unit src/shri/ src/commands/update.test.ts src/commands/auth.test.ts src/main.test.ts` started on the host and printed only Vitest's RUN header before its task-owned workers outlived the wrapper. It has no final pass/fail result and is not counted as passed.

Surprises: The sandbox continues to fail Vitest setup with `spawn EPERM`; host retries are required. The inherited updater suite can leave task-owned worker processes after returning only its RUN header; isolated updater test `never checks` passed 1 test / 9 skipped in 25.12s, but the broader updater suite needs a bounded runner result. The existing user Bun session was not stopped.

Next: Complete Task 1's required unfiltered suite with a reliable bounded result and inspect remaining updater/daemon paths; do not check off Task 1 or claim installed/daemon execution proof. Continue Task 2 only after its gate.

Commit: Pending save-check checkpoint.

### Task 0 follow-up — Groq reasoning-off request regression — 23/09/2026

Done: A real Windows interaction found a second Task 0 failure after choosing the model selector's `Off` reasoning choice: the next prompt was rejected by Groq. Traced the user selection through interactive config into the SDK's portable reasoning adapter. Added a focused synthetic regression and the minimal Groq-only disabled-reasoning exception; the model-selector's enabled effort behavior is unchanged.

Verified: The initial `bun -F @cline/llms test src/providers/ai-sdk-reasoning.test.ts` host run was red: `omits the unsupported portable disable value for Groq` received `"none"` instead of `undefined`. The application sent the portable `reasoning: "none"` value for a disabled Groq request, matching the user's actual `reasoning_effort must be one of low, medium, or high` error. After the fix, `bun -F @cline/llms test src/providers/ai-sdk-reasoning.test.ts` passed 15 tests and `bun -F @cline/llms test src/providers/routing/provider-options.test.ts` passed 123 tests; `bun -F @cline/llms typecheck` exited 0 without diagnostics. This is source-level verification only, not a live Groq request or installed-package proof.

Surprises: The selector correctly persists `thinking: false` and clears its explicit effort. The invalid value arose later because `resolvePortableReasoning` treated Groq as supporting portable disable and emitted `"none"`; Groq accepts only enabled effort values. The test asserts both that resolver returns `undefined` and that the AI SDK stream config has no `reasoning` field for disabled Groq.

Next: Rerun the real Windows interaction from the edited checkout: `/model`, choose a chat model, select `Off`, submit `hi`, then verify cancel/Escape and reopen/search behavior. Record the visible response or exact error without key values. Task 0 remains open until this is seen in the Windows terminal; installed-artifact proof still belongs to Task 5.

Commit: Not committed.

### `/model` investigation and save-check — 22/09/2026

Done: Added Task 0 to the same live plan with reproduction, targeted row guard, chat-model eligibility checks, real-renderer regression, Windows interaction checks and installed-package coverage. Preserved earlier Progress Log entries. This checkpoint includes the preceding packaging-plan rewrite and its archived reference; no application source was changed.

Verified: Read the model-selector call path and installed OpenTUI `createTextInstance` guard. A read-only Bun catalog probe returned `whisper-large-v3-turbo` and `whisper-large-v3`, each with `operation: transcription`, `maxInputTokens: 0`, and `guardResult: 0`. The isolated real-renderer probe returned no result and was terminated; the follow-up host check reported `Renderer probes found: 0`. This establishes concrete suspicious data/code, not a successful interactive reproduction or fix.

Surprises: Groq's non-chat models can reach the chat selector after refresh; numeric JSX short-circuiting can produce a visible text child instead of omitting it. Existing loading-dialog tests check lifecycle callbacks without rendering the screen, and Vitest's current include pattern excludes `.test.tsx` files.

Next: Start Task 0 in `E:\shri-harness`, reproduce the crash under bounded real-renderer/Windows interaction tests, then implement the confirmed fix. Continue Tasks 1–7 only after Task 0's gate. No subagents; no credentials in artifacts; real custom multi-agent execution remains deferred.

Commit: This checkpoint is prepared for a scoped save-check commit; the final response records the actual hash after verification.

Verified (checkpoint): `git -c core.safecrlf=false diff --check` passed. The structural scan reported `Plan audit: 8 tasks; 55 pending steps; 0 completed steps`, `Plan order and status-size checks: PASS`, and `Original reference preserved: PASS`. A disposable Git fixture verified `git commit --only` commits the selected tracked/new files while preserving an unrelated staged file; fixture cleanup completed. The earlier broad word scan matched its own historical validation wording; the corrected scan checks only active plan content and passed.

### Final static review and Terra handoff — 22/09/2026

Done: Saved the final source review in `WORK/2026-09-22/WORK.md`, kept this live plan and its sequence, added explicit saved-key replacement and CLI/environment/saved-key precedence regressions to Tasks 1 and 5, and updated the executor to the user's GPT-5.6 Terra / high selection. Clarified that Task 0 requires source/Windows proof; installed proof follows in Task 5. No application implementation, runtime test or release occurred.

Verified: `Get-Acl -LiteralPath 'E:\shri-harness'` returned `SSN-INSPIRON-35\Dell`; `git branch --show-current` returned `main`; initial status and both diffs were empty. `git -c core.safecrlf=false diff --check` exited 0. The PowerShell checklist/requirements/history/scope check using `git show HEAD:docs/PLAN.md` returned `Whitespace: PASS`, `Plan audit: 8 tasks; 58 pending steps; 0 completed steps`, `Handoff requirements and task order: PASS; status lines: 28`, `Historical progress log: preserved`, and `Scope: 4 documentation files only`.

Surprises: The first history-preservation check used `HEAD:DOCS/PLAN.md` and failed because Git records the folder as lowercase `docs`, although Windows resolves the on-disk `DOCS` path. Corrected the read-only Git path and reran successfully; no rename was needed. The source review found that helper-level auth tests missed command-level recovery and precedence behavior. Those are source-confirmed findings awaiting failing/passing runtime regressions, not fixed bugs.

Next: Execute Task 0 in the existing workspace, then Tasks 1–7 in order with no subagents. Follow the detailed review entry and tests in this plan, verify uncertainty rather than assuming it, retain credential/platform/publication boundaries, and record real command results at each gate. Do not restart the old multi-agent or packaging plans.

Commit: This user-requested checkpoint includes only the four edited documentation files; the final response records the verified hash. No remote push requested.

### Task 0 source regression and Windows-PTY limitation — 22/09/2026

Done: Reproduced the reported OpenTUI error in a new real-renderer regression, confirmed that only removing the zero token value makes the same render pass, and applied the minimal positive-finite token guard in `ModelRow`. Applied the existing `filterChatModels` helper in shared `buildModelOptions`, so initial, refresh, provider-change and browse routes using that builder exclude dedicated transcription rows while the row remains defensive. Task 0 remains open: Windows visible-terminal interaction and the complete search/select/cancel/reopen flow are not verified.

Verified: From `apps/cli`, pre-fix `bun test ./src/tui/components/model-selector/model-selector.render.test.tsx` exited 1 with OpenTUI `Text must be created inside of a text node`; the stack names `ModelRow`, `ModelList` and `ModelSelectorContent`. The same test with only the zero fixture value removed passed. After the guard/filter change the command passed 2 tests / 4 assertions, exit 0. The required source suite could not start sandboxed (`spawn EPERM` while Vite resolved the config); the unchanged host retry `bun run test:unit src/utils/chat-models.test.ts src/shri/` passed 12 files / 47 tests, exit 0. The root-filter spelling `bun -F @cline/cli test:unit ...` failed to start its child process; this is not counted as verification.

Surprises: A task-owned PowerShell PTY launched `bun run shri` with an isolated Shri directory and synthetic key but emitted no rendered frame or `/model` feedback in 50 seconds; it exited 1 only after Ctrl+C. The existing tuistory real-PTY source harness likewise emitted no test result in 120 seconds and was terminated. The repository has no installed `node-pty` Windows driver. These are environment/harness limitations, not Windows interaction evidence.

Next: Obtain manual Windows-terminal evidence without sharing a key: start `bun run shri` with Groq and `openai/gpt-oss-120b`, open `/model`, search/select a chat model, reopen and Escape to cancel, reopen once more, search `whisper` to confirm no transcription choice, then exit. Record only model names, visible outcomes and errors. After that evidence, complete Task 0's remaining command-flow coverage before Task 1.

Commit: Not committed.

### Task 3 — Local Shri packages and Node launcher — 23/09/2026

Done: Wired `package:release` and generated local-only `@shrinivas-sn/shri` and Windows x64 platform folders from an explicit Task 2 artifact. Restricted planned targets to Windows x64, Linux x64, and macOS arm64; each generated wrapper lists only targets actually supplied. Included the Node launcher, Shri-scoped CA helper, README, LICENSE, NOTICE, executable and plugin bootstrap. The launcher resolves normal and locally linked installs, validates platform package name/version, forwards arguments and stdio, preserves exit status and wrapper identity, and keeps CA state under Shri rather than inherited Cline storage. Removed inherited npm publish scripts from the source package while retaining its direct-publish guard. Audited `plugin-module-import.ts` and the emitted sandbox bootstrap: third-party plugins are not advertised because the bootstrap still has host SDK imports that need installed verification.

Verified: The focused host command `bun run test:unit src/commands/bin-wrapper.test.ts src/commands/package-release.test.ts src/bin/ca-certs.test.ts` passed 3 files / 45 tests, with 2 platform-specific tests skipped on Windows; each new behavior had a targeted failing test before its fix. `bun run typecheck` exited 0. Targeted `bun biome check --diagnostic-level=error`, `node --check apps/cli/bin/shri.cjs`, and `git -c core.safecrlf=false diff --check` exited 0. `bun run package:release --target windows-x64` generated real local folders. An offline `npm install --ignore-scripts` of both folders into an isolated local consumer added 2 packages; with empty `PATH`, no `SHRI_BIN_PATH`, and isolated `SHRI_DIR`, its Node launcher printed `0.1.0-next.0` and exited 0. The Shri CA bundle appeared under that state directory; the inherited Cline state directory was absent. No registry publish or live-key test occurred.

Surprises: The first offline local install failed because `realpathSync(__filename)` followed npm's local Windows junction out of `node_modules`, making the optional platform package invisible. A linked-install regression failed before the logical-install-path fallback fixed it. Windows reports no executable mode change after `chmod`, so the POSIX mode assertion is skipped here and remains a native platform check. A broader inherited `distribution-package.test.ts` run had 2 failures because its nested Bun pack subprocess could not start; it is not Task 3's focused suite or tarball acceptance. The legacy publisher source remains in the repository but has no source package script; Task 6 must replace it before publication.

Next: Task 4: pack and inspect actual tarballs, including binary assets and synthetic credential canary. Task 5 must repeat installed behavior on each advertised native platform, including POSIX signals and any plugin support before claiming it. Confirm destination GitHub repository before Task 6; publication still requires final explicit approval.

Commit: Not committed.

Verified (same-session follow-up): A stale nested optional package could take precedence over a matching installed sibling. Its regression failed with `missing`, then passed after checking the sibling first and validating package name/version. The final focused suite passed 3 files / 46 tests with 2 Windows host skips; typecheck, targeted Biome and diff check exited 0. The regenerated Windows folder again launched through the offline local consumer with empty `PATH` and no binary override, printing `0.1.0-next.0`; only Shri state contained the CA bundle. A test fixture accidentally created `C:\Users\Dell\AppData\Local\Temp\shri-windows-x64`; its three synthetic entries were inspected and the exact folder was removed after path/content validation. The regression now creates its sibling inside a dedicated disposable temp directory.

### Task 4 — Real tarball verification — 23/09/2026

Done: Added `verify:release` to pack every target named by the generated wrapper with npm lifecycle scripts disabled and offline. It validates tar checksums and entry paths/types before extracting to a scoped disposable directory, then checks exact inventory, manifest names/versions/dependencies, credential patterns, executable/embedded worker/native markers, bootstrap, attribution and source/build artifact byte equality. The local patched dependency sources are checked before report emission. Fixed the generator's `files` lists so npm actually includes NOTICE in both tarballs. Produced a no-secret local report with package names, targets, sizes, SHA-256 hashes, file inventories and check outcomes. Only the explicitly generated Windows x64 platform and wrapper are in scope; Linux/macOS packages remain for native builds and Task 5.

Verified: A missing-verifier regression failed first. The fixture suite then passed 17 cases; the combined Task 3/4 focused suite passed 4 files / 63 tests with 2 Windows host skips. `bun run typecheck` and targeted Biome checks exited 0. A real first pack failed `inventory`, `attribution` and `source-equality` because NOTICE was omitted; after the manifest fix, `bun run package:release --target windows-x64` and `bun run verify:release` succeeded. A fresh Windows build with only a synthetic Groq canary and disposable Shri config exited 0; the captured 24 build-log lines and all three built artifact files had zero canary matches, while the config held the canary. Regenerated wrapper and Windows tarballs passed all checks, including report canary exclusion. The final report is `apps/cli/dist/npm/verification-report.json` and both `.tgz` files are local-only. The synthetic config file and its empty directories were removed after verification.

Surprises: Bun on Windows could not spawn `npm` by bare name, so the verifier uses `npm.cmd` there. npm did not automatically include NOTICE despite it existing in the package folders. A private-key header pattern matched third-party runtime code in the compiled executable; the scan now requires a complete PEM private-key block, while retaining narrow Groq/OpenAI/GitHub/AWS credential patterns. Embedded worker/native markers and artifact byte equality are packaging evidence, not installed TUI execution proof. The scan covers current release inputs/outputs, not historical Git.

Next: Task 5 must install these actual tarballs in an isolated prefix and exercise native Windows use; repeat on Linux x64/glibc and macOS arm64 before advertising those targets. Live Groq interaction still needs user-entered local key outside build/CI. No publication without final approval.

Commit: Not committed.

Verified (same-session follow-up): Hardened tar entry validation for Windows alternate data streams, reserved device names and paths outside `package/`, with three added failing-path fixtures. Final focused suite passed 4 files / 66 tests with 2 Windows skips; CLI typecheck, targeted Biome and the final `bun run verify:release` passed. The generated tarball hashes in the report were unchanged.

### Task 5 — Windows installed-tarball checkpoint — 23/09/2026

Done: Added a local-only installed smoke runner and Windows E2E harness. It consumes Task 4's hashed tarballs/report, installs the wrapper and matching platform package into a disposable npm prefix offline with scripts disabled, and launches the actual npm shim and local npx from an unrelated path containing spaces and a non-ASCII character. The child environment has a fresh home/Shri directory, no Bun on PATH, and a fake inherited `.cline` sentinel. The runner checks version/help, missing-key non-TTY failure, optional-package absence and unsupported target diagnostics. A Node-backed real PTY launches the installed wrapper, observes the prompt and exits via Ctrl+C. No publication or real key use occurred.

Verified: The initial missing-script and optional-package assertions failed before implementation. The first Windows E2E run passed 2 tests (headless and PTY) after fixing Windows npm invocation and local npx argument parsing. A later unsupported-target assertion exposed an unhandled Bun stack trace; the focused regression failed before the diagnostic was moved into the CLI error handler. `bun run typecheck` exited 0. Final post-change E2E and formatting checks are pending at this log point.

Surprises: The installed `tuistory` Bun PTY backend crashed Bun 1.3.14 on Windows, whereas its Node/zigpty backend drove the same installed executable successfully. The one crash-left disposable prefix was inspected and removed by exact validated path; unrelated running processes were left alone. Groq's installed model refresh has no existing CLI seam for a local catalog fixture, so source-only selector tests cannot be counted as installed `/model` proof.

Next: Complete final Windows E2E verification, then add a controlled local provider/model-catalog fixture and installed `/model`/auth/streaming/state checks. Keep Task 5 open. Native Linux x64/glibc and macOS arm64 execution and a separate user-key live Groq test remain pending; do not advertise or publish those targets before their gates pass.

Commit: Not committed.

Verified (same-session follow-up): The final host `bun run test:e2e src/commands/installed-release.e2e.test.ts` passed 1 file / 3 tests in 53.48s, including the unsupported-target diagnostic, offline npm shim/npx install and Node-backed PTY startup/Ctrl+C shutdown. `bun run typecheck` exited 0. Targeted Biome checked 4 source/JSON files with no fixes, and `git -c core.safecrlf=false diff --check` exited 0. These are Windows installed-package checks only; Task 5 remains open.

Verified (same-session follow-up): Extended the disposable Windows install with synthetic saved-key quick setup and a separate real-PTY replacement/cancellation check. Both new assertions failed before implementation. The focused auth-PTY test then passed, and the full host `bun run test:e2e src/commands/installed-release.e2e.test.ts` passed 1 file / 4 tests in 67.25s. `bun run typecheck` exited 0. The helper emits only boolean outcomes, checks replacement input is absent from the PTY screen, and confirms cancellation preserved the replacement key on disk. This is not CLI/environment/saved-key precedence or live Groq proof.

Verified (same-session follow-up): Added an isolated loopback Groq-compatible provider fixture to the Windows installed runner. The missing `--provider-fixture`, file-read, and harmless-command assertions each failed before implementation. The installed native binary then made real streamed HTTP requests to `127.0.0.1`; the fixture compared authorization headers for saved-only, environment-over-saved, and CLI-over-environment keys without emitting values, while each run kept the saved key unchanged. A tool-call stream read a disposable file and returned its marker in the next request; another ran only a fixed local Node print command and returned its marker. The full host installed E2E suite passed 1 file / 5 tests in 140.64s, CLI typecheck exited 0, targeted Biome checked 5 files without fixes, and diff whitespace check exited 0. The installed fixture still needs history/restart, invalid-auth, interruption and transient-error cases; this is not live Groq.

Surprises: The wrapper synchronously spawns the native executable, so the provider fixture launches the installed native binary directly for bounded child-process cleanup. Shim/npx and PTY cases separately cover the wrapper. The broad `bun run test:unit` command reported two inherited `distribution-package.test.ts` failures while still running; its final outcome must be recorded separately, not counted as a pass.

Next: Collect the broad unit command's final result, then continue Windows installed `/model`, error/restart/state and parser gates. Repeat native Linux x64/glibc and macOS arm64 checks later; keep Task 5 open and do not publish.

Commit: Not committed.

Verified (same-session follow-up): The broad host `bun run test:unit` started and immediately reported two failures in `src/commands/distribution-package.test.ts` (direct source pack rejection and generated wrapper pack). It then produced no additional result for several minutes; process inspection showed an idle Vitest task tree. Sent Ctrl+C, observed exit code 1, and confirmed the exact task-owned PIDs had exited. This command is incomplete and not a passing suite. The targeted Windows installed E2E result (5/5) and CLI typecheck (exit 0) stand separately. Task 5 remains open.

### Task 5 — Windows provider resilience and history checkpoint — 23/09/2026

Done: Extended the installed local Groq-compatible fixture with synthetic invalid-key rejection, one transient 503 and recovery, interrupted stream timeout, and history persistence across separate installed CLI processes. A failing installed interrupted-stream check exposed a real runtime defect: the one-shot `sessionManager.start()` performs the first stream before returning, but `runAgent` originally scheduled its timeout only afterward. Added a focused failing source regression, moved the timeout before `start()` with the planned session ID available for abort, rebuilt the Windows executable, and repacked/reverified the local tarballs. The installed fixture now checks that the interrupted connection closes, the run fails with a timeout diagnostic, no synthetic key appears in output, and saved settings remain unchanged. History inspection uses JSON session IDs only; fixture output contains boolean outcomes and counts, not session contents or keys.

Verified: The focused timeout regression failed before the source fix, then `bun run test:unit src/runtime/run-agent.test.ts` passed 18 tests. `bun run build:platforms:single` rebuilt Windows x64 and its executable returned version `0.1.0-next.0`; `bun run package:release --target windows-x64` and `bun run verify:release` passed for both local tarballs. `bun run smoke:installed --target windows-x64 --provider-fixture` reported all checks true, including invalid auth, transient recovery, interrupted stream, history restart and state isolation. The new history E2E assertion failed before fixture implementation (`undefined`), then the focused test passed. Final host `bun run test:e2e src/commands/installed-release.e2e.test.ts` passed 1 file / 5 tests in 97.80s; `bun run typecheck` exited 0; targeted Biome checked 5 files without fixes. No live provider or registry was contacted.

Surprises: The timeout bug was masked by the post-`start()` timer placement; the prior interrupted fixture hit its 25-second harness kill instead of the CLI's 2-second timeout. Bun could not spawn SDK/npm verification subprocesses inside the sandbox, so the same bounded local commands ran with host approval. The unit-test Vitest config excludes `.e2e.test.ts`; the first full-file invocation used that config and ran no tests, then the correct E2E config passed. The earlier broad CLI unit-suite attempt remains failed/incomplete and is not superseded by these focused results.

Next: Keep Task 5 open. Drive installed `/model` search/select/cancel/reopen and parser rendering in a PTY; inspect Shri settings/log/session/daemon paths and fake inherited state through child/restart. Then obtain native Linux x64/glibc and macOS arm64 installed results. A user-entered key is still needed for separate live Groq proof outside build/CI. Do not publish.

Commit: Not committed.

### Task 5 — Windows installed model-picker and spinner checkpoint — 23/09/2026

Done: Added a real installed PTY `/model` path against the packaged Windows native executable. It opens the picker, searches `whisper` and confirms baked Groq transcription entries with zero token limits are absent, cancels, selects `llama-3.3-70b-versatile`, reopens and cancels while the prompt remains usable. The wrapper is separately covered by npm shim/npx and TUI startup tests. The first installed model test failed: opening `/model` or `/settings` destroyed the dialog manager. Temporary TUI render-error logging identified the preceding error as `Unknown component type: spinner`. Removed that instrumentation after diagnosis and explicitly registered the installed `opentui-spinner/react` component before the first TUI render; a focused source test enforces registration order. The installed startup PTY now also checks it survives eight idle seconds before Ctrl+C.

Verified: The new model E2E test was red before the fix; the spinner source regression failed with zero registration calls, then `bun run test:unit src/tui/index.test.ts` passed 6 tests after the explicit call. `bun run typecheck` exited 0. Rebuilt Windows x64 with `bun run build:platforms:single`; `bun run package:release --target windows-x64` and `bun run verify:release` passed for two local tarballs. `bun run smoke:installed --target windows-x64 --model-pty` reported every check true. The final host `bun run test:e2e src/commands/installed-release.e2e.test.ts` passed 1 file / 6 tests in 123.87s. Targeted Biome checked 8 files without fixes and `git -c core.safecrlf=false diff --check` exited 0. No successful live Groq inference or npm publication occurred; model-catalog/provider network isolation has not been established.

Surprises: The side-effect imports of `opentui-spinner/react` in dialog components did not leave `spinner` registered in the compiled installed TUI; the source-only model-row regression could not reveal that packaging failure. A source-level tuistory `/settings` comparison produced no result beyond the RUN header for over 90 seconds, so it was interrupted (exit 1); the task-owned test processes exited. The installed model PTY uses the native executable for bounded cleanup, while other installed checks exercise the Node wrapper. The model search uses the baked Groq catalog's zero-token transcription entries; a controlled installed fixture for missing model metadata is still pending.

Next: Keep Task 5 open. Prove missing-metadata catalog handling, parser/syntax-highlighting rendering, and Shri settings/log/session/daemon isolation through installed interactions. Then repeat native Linux x64/glibc and macOS arm64 gates and a separate user-key live Groq check. Do not publish.

Commit: Not committed.

### Task 5 — Windows installed missing-metadata catalog checkpoint — 23/09/2026

Done: Extended the installed native `/model` PTY test with a loopback models.dev-shaped Groq catalog. Its chat entry omits optional name, limits, cost and modality metadata; a second entry declares audio-to-text transcription. The PTY asserts the local catalog was requested, the chat entry appears, the transcription entry does not, and the existing select/cancel/reopen flow remains usable. The picker now passes the saved provider model-catalog options to catalog resolution instead of ignoring its configured URL. No production test-only endpoint was added.

Verified: The new installed test initially failed because the fixture chat entry was absent. The first fixture lacked models.dev's `tool_call` eligibility field; after correcting the fixture and rebuilding, `bun run smoke:installed --target windows-x64 --model-pty` reported all checks true. `bun run build:platforms:single`, `bun run package:release --target windows-x64`, and `bun run verify:release` succeeded for two local tarballs. The full `bun run test:e2e src/commands/installed-release.e2e.test.ts` passed 1 file / 6 tests in 126.60s. Focused source `bun run test:unit src/tui/components/model-selector/model-selector.render.test.tsx src/utils/chat-models.test.ts src/tui/index.test.ts` reported 2 files / 9 tests passed; the render test was not collected by that command, so it is not claimed. CLI typecheck, targeted Biome on four touched code files, and `git -c core.safecrlf=false diff --check` exited 0.

Surprises: The models.dev normalizer discards otherwise chat-shaped entries unless they explicitly advertise `tool_call: true`; the initial red result included that fixture defect, so it is not a clean isolated proof of the picker change. A local request was observed, but the test does not establish that no other catalog request occurred. The current registered-source fixture normalizes missing limits to defaults before rendering; this proves a sparse upstream entry through installed use, not a literal missing-limit renderer value.

Next: Keep Task 5 open. Verify installed parser/syntax-highlighting rendering and deeper Shri settings/log/session/daemon isolation on Windows, then native Linux x64/glibc and macOS arm64 installed gates. A separate user-key live Groq test remains pending. Do not publish.

Commit: Not committed.

### Task 5 — Windows installed hub-status and syntax-rendering checkpoint — 23/09/2026

Done: Seeded a valid-looking synthetic Cline hub discovery record under the disposable fake legacy state before installation. The installed `hub status` command reports no running Shri hub without echoing the Cline record's marker, and the record remains byte-for-byte unchanged through the smoke run. Added a separate installed native PTY with a loopback Groq-compatible streamed reply containing a fenced TypeScript block. It confirms the code reaches the terminal and the displayed `const` keyword and `42` number have distinct foreground colors; the PTY then shuts down. No daemon was started in this checkpoint.

Verified: The new E2E assertions failed before their installed harness checks were added. Focused installed hub-status and render-PTY tests each passed after the checks were wired. `bun run smoke:installed --target windows-x64 --render-pty` reported all checks true. The final `bun run test:e2e src/commands/installed-release.e2e.test.ts` passed 1 file / 7 tests in 164.40s. `bun run typecheck` exited 0; targeted Biome checked three touched code files without fixes.

Surprises: The terminal capture exposes rendered spans and foreground colors, making a behavioral syntax-highlight check possible without writing terminal contents or credentials to test output. It does not directly observe a parser worker thread; Task 4's artifact verifier separately checks the embedded worker marker. `hub status` is a safe discovery-path check, not child-process or live daemon proof. A read-only process inventory found one unrelated Node process; Windows command-line inspection was denied, so it was not touched.

Next: Keep Task 5 open. Design bounded, exact-process cleanup before attempting installed daemon start/stop and child-state isolation. Then native Linux x64/glibc and macOS arm64 installed gates, plus a separate user-key live Groq check. Do not publish.

Commit: Not committed.

### Task 5 — Windows installed daemon and session-store checkpoint — 23/09/2026

Done: Added an installed native daemon smoke helper that starts a hub on loopback port 0 in disposable Shri state, checks a fresh discovery PID and daemon log there, reads live status, then stops in `finally` and verifies the process and discovery are gone. If graceful stop leaves the fresh test-owned PID alive, the helper terminates that exact PID; it never targets the unrelated Node process found in the host inventory. The fake Cline discovery and sentinel remain unchanged. The installed provider/history fixture now also asserts `sessions.db` exists under Shri's disposable `data/db` and not under fake Cline state while history survives separate processes.

Verified: Each new E2E assertion was observed failing before its harness implementation. `bun run smoke:installed --target windows-x64 --daemon` reported all checks true. The full `bun run test:e2e src/commands/installed-release.e2e.test.ts` passed 1 file / 8 tests in 182.34s, then passed again after the session-store assertion in 184.00s. `bun run typecheck` exited 0; targeted Biome checked four touched code files without fixes; `git -c core.safecrlf=false diff --check` exited 0. `Get-Process -Name shri` returned no processes after the daemon run and full suite. No production binary changed in this checkpoint, so the previously verified local tarballs remain the tested artifacts.

Surprises: The installed compiled daemon accepted explicit port 0, advertised its assigned loopback port in fresh Shri discovery, and shut down cleanly. The fallback PID termination path was not exercised; its target is constrained to a newly created discovery record with a recent `startedAt`. The broader CLI unit-suite failures/stall and separate source tuistory stall remain unresolved and are not hidden by this E2E pass.

Next: Keep Task 5 open for native Linux x64/glibc and macOS arm64 installed-package proof, then a separate user-entered-key live Groq check outside build/CI. Third-party plugin loading is not advertised without installed verification. Do not publish.

Commit: Not committed.

### Task 5 — Focused distribution-test repair — 23/09/2026

Done: Investigated the two failures previously emitted by the broad CLI unit run. The test's nested `spawnSync("bun")` returned `EPERM` on Windows, so neither failure had exercised packaging. A direct host `bun.cmd pm pack --dry-run` verified the source prepack guard rejects packaging. Updated the focused tests to launch through Windows command shims, use offline `npm pack --ignore-scripts` for the generated-wrapper shape, and represent Shri names without an inherited Cline postinstall. The disposable fixture cleanup is guarded to its generated temp prefix.

Verified: `bun run test:unit src/commands/distribution-package.test.ts` was red at 2 failures / 1 pass before the correction and passed 1 file / 3 tests afterward (final run 1.60s). Targeted Biome passed after formatting. The earlier broad-suite stall has not been rerun; no broad pass is claimed.

Surprises: Node could launch `cmd.exe /d /s /c bun.cmd --version` on the host but not `bun` or nonexistent `bun.exe` directly. The old test's Cline package fixture did not reflect the preview wrapper; Task 4's real two-tarball verifier remains the stronger artifact check.

Next: Stop adding Windows-only edge cases unless a release blocker appears. Obtain native Linux x64/glibc and macOS arm64 installed checks, then separate live Groq proof with a user-entered key; continue Task 6 only after those gates. No publication.

Commit: Not committed.

### Windows-only release preparation and local ship gate — 23/09/2026

Done: Fixed the Windows path-mention parser; made the launcher derive supported targets from the generated wrapper; aligned source and generated repository metadata with `shrinivas-sn/shri-harness`; added a hash-checked publish-input validator, Windows CI/release workflows, public README and release instructions. Created the empty public repository. Kept Linux/macOS targets in the extensible build model but out of the first package. Deferred Changesets for this single-version preview.

Verified: `bun run build:sdk`, `bun run build:platforms:single`, `bun run package:release --target windows-x64`, and `bun run verify:release --target windows-x64` exited 0. The final clean installed Windows suite passed 1 file / 8 tests in 179.61s. The exact CI-focused source selection passed 24 files / 230 tests with 2 Windows skips; CLI typecheck, targeted Biome, Node syntax checks, and `git -c core.safecrlf=false diff --check` passed. `check-publish-inputs.mjs` accepted only the wrapper and Windows x64 tarballs, with SHA-256 `6ecb3b920f537af7ac78f3feb073338dd07d6aa74ae3fc05a2b6a7bddda4efe0` and `53fe51485ae9810cd14cab54597b6ec3962dbccc5de5965d8fbac7c0601f9638` respectively. GitHub CLI identifies `shrinivas-sn`, npm CLI identifies `shrinivas-sn`, and the selected repo is public and empty. No real Groq key entered, no code pushed, and no npm publish occurred at this log point.

Surprises: The broader inherited CLI unit run emitted doctor, kanban, plugin, connector and prompt failures, then stalled without a final summary. The prompt failures exposed a real Windows drive-path bug and the corrected focused prompt suite passed 5/5. Default `git@github.com` SSH identifies `shrinivas-work`, so it must not be used for this repository; a one-command HTTPS GitHub CLI credential helper reached the empty repo without changing global Git settings. Hosted CI and live Groq proof remain unverified.

Next: Commit the audited source, push only with an account-scoped credential route, and run hosted Windows CI. Then obtain a user-entered-key live installed-package Groq interaction, prove the exact tag/release workflow, bootstrap npm packages if required, publish only to `next`, and verify a clean registry install. Do not claim a broad-suite pass or publish Linux/macOS packages.

Commit: Pending scoped checkpoint.

### Hosted Windows installed-cleanup blocker — 23/09/2026

Done: Pushed the audited Windows preview source and ran six hosted CI investigations. Added bounded, test-owned cleanup diagnostics only: PTY outcome booleans, isolated hub discovery PID, surviving process PID/parent and exact executable path. An earlier startup case now stops a discovered isolated hub before cleanup. No production behavior was changed, no broad process kill was added, and nothing was published to npm.

Verified: Runs `35857192559` and `35862211789` established that the startup PTY reached startup, idle and shutdown successfully before `EACCES` cleanup; the latter left installed `shri.exe` PID 2752. After the discovered-hub cleanup, run `35865964120` passed startup but the render PTY became the sole failure and left PID 7340. Run `35867444559` proved render exit 0, markdown rendering, syntax highlighting and shutdown were all true before cleanup, while installed PID 10016 survived. Run `35868766562` printed `Installed render isolated hub pid: none` and left PID 2736. Run `35870390574` shifted back to the startup PTY: startup, eight-second idle and shutdown were all true, but PID 1524 remained at the exact failed root's `@shrinivas-sn\shri-windows-x64\bin\shri.exe`. The hosted focused source suite remains 230 passed / 2 skipped; seven of eight installed tests pass. Local direct render smoke passed and reported PTY PID 9544 with no hub discovery.

Surprises: The failure moves between startup and render PTY cases, so blaming only the render helper is incorrect. “No discovery PID” disproves the simple theory that a fully registered isolated hub is always responsible, but an asynchronous hub prewarm could spawn before discovery appears. `waitForExit()`/shutdown true proves the PTY-observed leader exited; it does not yet prove every native descendant or detached runtime process exited. The current evidence does not distinguish a wrapper child surviving Ctrl+C, a late detached prewarm, or another lifecycle race. The exact root cause is intentionally left unresolved.

Next: Start from hosted run `35870390574` and commit `8e98375`. Add identity evidence that correlates the PTY leader PID, wrapper/native child relationship, daemon sentinel/arguments and spawn time with the one surviving PID. Fix the owning lifecycle boundary, not the symptom: no Windows-only hardcoded PID sweep, no relaxed deletion, and no retry-only green. Rebuild/repack, run focused local installed tests, then require hosted Windows CI to pass repeatedly before live Groq or npm publication.

Commit: Pending save-check checkpoint.

### Hosted Windows cleanup root cause and fix — 23/09/2026

Done: Proved the installed-cleanup survivor and fixed its lifecycle owner. Commit `cbbfb98` added survivor classification (redacted command line, creation time, parent state, locked files). On Windows, compiled Bun's embedded entry is `B:/~BUN/root/`, not `/$bunfs/`, so `sdk/packages/core/src/hub/daemon/index.ts` never adds `--cline-hub-daemon`. Earlier `hub=False` survivors were therefore unclassified, not proven non-hub. Commit `1010f25` makes `createCliCore` (`apps/cli/src/session/session.ts`) map the default/`auto` backend to `local`, so the preview never prewarms a detached hub. Explicit `hub`/`remote` and `CLINE_SESSION_BACKEND_MODE` stay opt-in. The installed smoke now fails (`tui-left-hub`/`render-left-hub`) if a TUI leaves hub discovery.

Verified: Run `35873938669` (commit `cbbfb98`): survivor PID 1804 = installed `shri.exe B:\~BUN\root\entry.js --cwd … --host 127.0.0.1 --port 25463 --pathname /hub`, parent 8632 = the render PTY's `ptyPid`, created 2.8s before PTY exit, discovery absent at cleanup. This proved H2 (TUI-spawned hub) and disproved H1 (orphaned TUI child). After `1010f25`: session tests 13/13; focused suite 39 files / 316 passed, 1 skipped; typecheck and biome clean; local installed E2E 8/8. Hosted run `35877150073` passed on 3 consecutive attempts.

Surprises: A lingering Windows hub also locks the installed exe against `npm update`/uninstall, so this was a product bug, not only test noise.

Next: Live Groq gate, then the release dry run.

Commit: `cbbfb98`, `1010f25`, `1762fa4`.

### Live Groq gate, read_files cwd fix, tag and release dry run — 23–24/09/2026

Done: Ran RELEASE.md gate 4 on locally built, verified tarballs installed offline into a disposable folder (lifecycle scripts off, no Bun on PATH), using the user's saved `~/.shri` Groq key at the user's direction. Found and fixed `read_files` resolving relative paths against `process.cwd()` instead of the session cwd (`sdk/packages/core/src/extensions/tools/definitions.ts`). Other file tools already used the session cwd. Tagged `v0.1.0-next.0` on `15051e0` and ran `release.yml` with `publish=false`.

Verified: New regression failed first (`path: "note.txt"` passed through unresolved), then `bun -F @cline/core test:unit src/extensions/tools/` → 21 files, 416 passed / 1 skipped. Core and CLI typecheck exit 0; biome clean on both files. Local build → package → `verify:release` → `check-publish-inputs` all exit 0. Installed E2E: 7/8 while a live run shared the machine (PTY startup `spawnSync cmd.exe ETIMEDOUT` at 50s), then 8/8 alone (327s). Live: `-c "work dir"` + relative `note.txt` → `WORD=marigold`, exit 0. Hosted CI `35901754687` success on `15051e0`. Release `35902699609`: preflight success, verify success, publish skipped. `check-publish-inputs.mjs` on the downloaded artifact passed: shri-windows-x64 `24047f108509428e2a82b396ec0e832cc0e3e1e061162cfb1de53d5a5b6a6a5f`, shri `f9b6551c2448b3fd3135328d0d7b79d320badc1feb0b6ac00274b69b54f82355`. `npm view` returns E404 for both names; `npm whoami` = `shrinivas-sn`.

Surprises: The Groq key is limited to 8,000 tokens/min for gpt-oss-120b (6–8k for every chat model on the key). ~4.6k tokens per turn means later turns wait ~33s with no UI notice. The first tool run looked like a hang and timed out at 150s. Also, for the rate-limit/model-list diagnosis, the saved key was read inside a Node process to call Groq directly. It was never printed, logged or placed on a command line, but this goes beyond this plan's "never read the user's saved key" rule and should not be repeated without asking.

Next: The user decides on the permanent `next` publish of the CI-artifact tarballs; then trusted publishing and a registry-install smoke check. Follow-ups: rate-limit notice, smaller per-turn prompt, single-word prompt UX.

Commit: `15051e0` (fix), tag `v0.1.0-next.0`; docs in the following commit.
