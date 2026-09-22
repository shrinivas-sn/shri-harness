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
- Build Windows x64 first. Planned release support: Windows x64, Linux x64/glibc, macOS arm64. Each requires native installed testing. Windows arm64, macOS x64, Linux arm64 and musl are deferred. If a planned target cannot pass, resolve it or obtain acceptance of a smaller release set before publication.
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

- [ ] Reproduce with Groq selected and the current model `openai/gpt-oss-120b`, using isolated configuration and no real key in test output. Record whether failure occurs in loading, list render, selection, or close. Use a bounded subprocess/PTY timeout; always close its renderer and terminate only task-owned children.
- [ ] Build a deterministic renderer regression using the current Groq fixture plus explicit model rows with token limit `0`, missing, and positive. Include a list long enough to exercise windowed rows. Create renderer/root before render and tear them down in `finally`, so a render exception cannot leak a terminal/native handle. Capture the current failure with the actual OpenTUI renderer; a mocked React tree or a successful numeric-expression probe alone is insufficient.
- [ ] Confirm or disprove the zero-child hypothesis by changing only that input/guard in the regression. If it does not reproduce the observed exception, trace loading-dialog, provider-row and dialog-portal children next and record the actual offending node before making a production change.
- [ ] Once confirmed, make optional token metadata render only for a finite positive number, returning `null` otherwise. Retain a defensive row guard even when non-chat models are filtered. A suitable existing-row expression is shown below; it must be validated against the regression, not pasted as a presumed cure.
- [ ] Reuse `filterChatModels` at the refreshed model-picker boundary so transcription models do not appear as chat choices. Cover initial and refreshed catalogs, provider changes, and model browsing routes sharing this picker. Preserve text/chat-compatible models and intentional manual custom-ID entry; test unknown metadata according to the existing filter contract rather than inventing name-based exclusions.
- [ ] Verify empty list, no search matches, current model absent, reasoning and non-reasoning selections, custom-ID entry, cancel/Escape, reopen, and provider-change return. Ensure cancel preserves the selected model, successful selection updates it, focus returns to the prompt, and no unhandled rejection or leaked dialog remains.
- [ ] Run the focused model/filter/native renderer tests, then the existing Shri/auth suite. Execute `bun run shri`, open `/model`, search, select, cancel, reopen and exit in a real Windows terminal. Record actual results separately from headless rendering. Use a user-entered key only if live provider confirmation is needed; no key should be needed for the fixture regression.
- [ ] Carry this exact interaction into Task 5's installed-artifact suite on each advertised platform. Record root cause, failing/passing evidence, and limitations in the work log before marking Task 0 complete.

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

- [ ] Add failing tests for help/version identity, absent automatic update requests, explicit Shri update instructions and child/daemon state isolation. Test `--config` > `SHRI_DIR` > default, using disposable home directories and a fake `.cline` sentinel.
- [ ] Initialize Shri state before updater, telemetry or daemon state access. Inspect import side effects, then propagate the resolved directory through the existing SDK environment conventions.
- [ ] Disable inherited telemetry/error export and automatic updates. Ensure explicit update behavior targets `@shrinivas-sn/shri@next` and cannot install `cline`.
- [ ] Preserve Groq defaults; test missing/invalid credentials without printing raw values. Inspect outgoing requests with synthetic credentials so no non-provider reporting includes them.
- [ ] Fix explicit auth recovery: `shri auth` must offer masked replacement of a saved Groq key rather than silently returning the existing value. Keep normal startup's reuse behavior. Cover a synthetic saved invalid key, successful replacement and persistence, cancellation preserving saved settings, and non-TTY failure with actionable guidance. Preserve the saved model when replacing only the key. An active environment key must not make explicit reconfiguration silently succeed; explain environment precedence without printing its value. Verify the 401 recovery instruction against the actual command flow; an assertion that the return code is merely defined is insufficient.
- [ ] Fix startup key precedence end to end: nonblank command-line key > nonblank `GROQ_API_KEY` > saved key > onboarding. `main.ts` currently bypasses `ensureGroqApiKey` whenever a saved key exists, despite `resolveGroqApiKey` prioritizing the environment. Add regressions at the startup/runtime boundary, not just helper tests, using distinct synthetic keys and checking the selected provider configuration. Cover blank overrides and ensure environment/command-line overrides are not persisted implicitly. Carry replacement and precedence cases into Task 5's installed checks.
- [ ] Correct public copy to single-agent preview; keep upstream credits. Mark the custom pipeline simulated in developer documentation and exclude its entrypoint from public release commands.
- [ ] Run the focused suite; self-review initialization across normal CLI, daemon and connector modes.

```powershell
bun -F @cline/cli test:unit src/shri/ src/commands/update.test.ts src/commands/auth.test.ts src/main.test.ts
```

**Gate:** Shri state applies before access in every supported process mode. Parent-only isolation and existing auth tests alone are insufficient.

### Task 2 — Build the terminal product deterministically

**Modify:** Root `package.json` / `bun.lock` for the tool pin; `apps/cli/bun.mts`, `script/build.ts`, `script/build-options.ts`. Extend `src/commands/build-options.test.ts`. Preserve the existing two patches in `patches/`.

**Interface:** Existing `build:platforms:single` produces a fresh host artifact without building the dashboard. Add `--with-hub-webview` as an explicit development opt-in; retain daemon services used by terminal sessions.

- [ ] Test default terminal build, explicit webview opt-in, unsupported targets and invalid options before implementation.
- [ ] Separate webview build/copy in both build paths. Any retained runtime route requiring missing assets must be handled explicitly; do not ship a broken hidden dashboard command.
- [ ] Replace `/tmp`, shell `rm -rf`, and cross-shell copy/chmod assumptions with native filesystem operations and scoped staging directories. Resolve and validate every recursive cleanup target; restore changed working directories in `finally`.
- [ ] Remove generic `OTEL_*` and telemetry-secret embedding. Build with an explicit minimal environment; never inline arbitrary environment values, `GROQ_API_KEY`, user homes or settings.
- [ ] Inventory parser workers, native libraries, plugin bootstrap and dynamic imports. Record required runtime files for Task 4's artifact check. Verify Bun compile support at the pinned version rather than relying on newer docs.
- [ ] Align Bun to `1.3.14`, retaining locked OpenTUI/React and patched dependencies. Change that pin only after recording a concrete blocker and validating the replacement.
- [ ] Check build success explicitly and reject missing outputs. Run the SDK and host builds from their correct directories.

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

- [ ] Test launcher platform selection, spaces/non-ASCII paths, argv forwarding, terminal I/O, exit status, signals, missing platform package and unsupported architecture. Use a controlled child fixture that exits 7; assert the launcher also exits 7.
- [ ] Implement `shri.cjs` with Node APIs only. Resolve installed platform files without repository paths. Forward Shri wrapper identity and configuration. Preserve corporate CA handling without touching Cline state.
- [ ] Omit inherited postinstall entirely; resolve binaries at launch. Installations with lifecycle scripts disabled must work and must not move Cline discovery files.
- [ ] Generate scoped public manifests and reject `workspace:*` dependencies or inherited upstream SDK dependencies. Keep internal source names private.
- [ ] Audit `sdk/packages/core/src/extensions/plugin/plugin-module-import.ts`. Supported built-in functionality must use packaged local code. If supported plugin loading needs unbundled host SDK files, include locally built support files/dependencies and test their resolution. Do not silently fall back to upstream packages. Do not advertise plugin support without an installed test.
- [ ] Keep the direct-publish guard; update its guidance to generated Shri artifacts. Publisher dry runs must never write to the registry.

```powershell
bun -F @cline/cli test:unit src/commands/bin-wrapper.test.ts src/commands/package-release.test.ts
# New script after implementation, from apps/cli:
bun run package:release
```

**Gate:** All public identity/launch paths target Shri; no workspace dependency escapes; launcher works without postinstall or Bun on PATH.

### Task 4 — Inspect real tarballs and exclude credentials

**Create:** `apps/cli/script/verify-release.ts`, `src/commands/release-artifacts.test.ts`; CLI script `verify:release`.

**Interface:** Pack each explicitly generated package with lifecycle scripts disabled. Extract the actual tarballs safely into a disposable directory. Produce a report with package/version, target, inventory, size, SHA-256, and check outcomes; never include secrets.

- [ ] Add failing fixtures for missing executable/worker/native/bootstrap files, mismatched versions, `workspace:*`, forbidden config files, and a synthetic key embedded in both text and binary bytes. Assert failure by check identifier without echoing matched secrets.
- [ ] Run `npm pack --json --ignore-scripts` in each generated directory. Validate extracted paths against traversal. Inspect the resulting files, not just the manifest allowlist or dry-run output.
- [ ] Compare contents to Task 2's asset inventory and verify locally patched code survives packaging. Consumers must not need the root Bun patch configuration.
- [ ] Build with only the synthetic `GROQ_API_KEY=gsk_SHRI_RELEASE_TEST_CANARY_DO_NOT_USE` and a disposable config holding that same canary. Scan executable bytes, tarball contents, assets, sourcemaps, build logs and reports for it. Never use the actual user's key.
- [ ] Scan release inputs for credential patterns and prohibited paths. Narrowly identify synthetic test fixtures; do not exempt every `gsk_` match. Record that this check covers release inputs/outputs, not an exhaustive historical Git audit.
- [ ] Verify licensing/attribution and README inclusion. Reject home directories, sessions, VCR recordings and unrelated repository files.

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

**Gate:** Windows first; repeat on Linux x64/glibc and macOS arm64. Cross-compilation is not native execution evidence. Live Groq verification has its own result.

### Task 6 — Automate releases and document the preview

**Create:** `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.changeset/config.json`, `DOCS/RELEASE.md`. Modify scripts, `apps/cli/README.md`, `DOCS/STATUS.md`, `DOCS/README.md` as needed.

- [ ] Confirm the destination GitHub repository before remote creation or publication metadata. Local work can continue without it; remote setup/provenance cannot. Do not invent ownership, URL or an existing remote.
- [ ] Recheck verify-claims' Changesets/OIDC workflow and current official npm requirements. Reuse the release conventions, not its small-library build commands. Keep Bun's lockfile; do not add npm lockfiles just to imitate the other repo.
- [ ] Add native build/test jobs for all planned targets. Select runner labels by verified runner architecture; never assume `macos-latest` architecture. Pin Bun and use frozen-lockfile installs.
- [ ] Separate artifact generation/testing from publication. Require every target job and package check to pass on the exact commit/version. Publish the tested tarballs after comparing their recorded hashes; do not rebuild them in the publish job.
- [ ] Configure Changesets to version only the release source (including its intentionally private source package if required). Generate wrapper/platform versions from that single value. Do not publish unrelated SDK workspaces. Validate the versioning flow locally before trusting CI.
- [ ] Retain prerelease mode and tag `next`. Publisher rejects unapproved names, missing planned targets, skewed versions, different artifact hashes, and accidental `latest` promotion.
- [ ] Restrict `id-token: write` to publishing. Use a pinned compatible release npm version after verifying requirements: official docs currently require npm >=11.5.1 and Node >=22.14.0; the preview's Node floor is >=22.15.0. No real Groq key in CI.
- [ ] Document install, supported targets, own-key onboarding, local configuration, provider data transmission, update/uninstall, preview limitations and deferred orchestration. Use measured package sizes.

**Gate:** CI gates exact publishable artifacts and repository/workflow identities match metadata. Missing GitHub setup means CI/provenance are pending, even if local artifacts work.

### Task 7 — Review, publish and verify the registry installation

**Update:** Release report, `DOCS/RELEASE.md`, `DOCS/STATUS.md`, current `DOCS/WORK/` record, and this plan's Progress Log.

- [ ] Present package names/versions/targets, inventory, sizes, hashes, test results, credential exclusion evidence and limitations. Obtain explicit publication authorization at this final step; this session authorizes plan edits, not public publication.
- [ ] Verify npm account/scope interactively without displaying tokens. Check current first-publish/trusted-publisher bootstrap support. Configure trust for every generated package. Never put npm credentials in the repository or workflow YAML.
- [ ] Publish platform tarballs first using `--access public --tag next`, confirm registry versions/integrities, then publish the wrapper. On retry, skip an existing matching version and reject different content at that version.
- [ ] On each supported target, install `@shrinivas-sn/shri@next` from npm into a fresh prefix and repeat installed smoke checks. Verify `npx @shrinivas-sn/shri@next --help` without Bun or this checkout.
- [ ] If installation fails, stop promotion and prepare a corrected prerelease. Do not overwrite published versions or treat unpublish as the default rollback.
- [ ] Record actual published URLs/versions/hashes and command outputs. Preserve deferred platforms and real multi-agent work. Archive durable reasoning/evidence before retiring this live plan.

**Gate:** Explicit publication authorization and actual registry-installation proof. No stable/latest release is authorized here.

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
