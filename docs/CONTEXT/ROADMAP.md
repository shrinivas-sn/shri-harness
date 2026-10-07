# Shri product roadmap

Updated 24/09/2026. These are proposed priorities from the codebase assessment, not approved implementation scope or a second live execution plan. The owner has prioritized chat/model reliability before additional features.

## Product baseline

- Published and globally installed preview: `0.1.0-next.1`, Windows x64.
- Public packages: `@shrinivas-sn/shri` and `@shrinivas-sn/shri-windows-x64`.
- The normal CLI uses the Cline-derived engine, Groq onboarding, and Shri state under `~/.shri`.
- `apps/cli/src/shri/index.ts` is a separate, unfinished orchestration prototype. Its fixed task, simulated executor, estimated usage, and returned-but-unsaved run record do not establish real orchestration.
- Internal SDK capabilities are not automatically supported npm-product features. Promote each only after installed-package evidence.
- This assessment is architectural and source-based; it is not a fresh full-suite pass or exhaustive production audit.

## Priority 0 — Reliable conversations and model selection

**Outcome:** Users can continue a conversation, resume it, and switch supported Groq models without request-format failures or silently losing history.

Work:
- Correct replay of assistant reasoning in Groq requests without deleting local history or affecting providers that require reasoning signatures.
- Base Groq model availability on the active endpoint and effective credentials, while using catalog metadata to describe capabilities.
- Distinguish availability from suitability: a listed audio, moderation, or non-tool model is not automatically a coding-agent model.
- Normalize reasoning controls per model. Never carry an unsupported setting into another model after a switch.
- Test fresh conversations, three consecutive turns, tool continuations, restored history, and switches between reasoning and non-reasoning models.
- Verify the compiled npm artifact in a real terminal/PTY, then perform bounded live verification using an isolated configuration.

Evidence required: request-body regressions, installed PTY results, preserved history/configuration, and live results clearly distinguished from fixture results. See [diagnosis](../RESEARCH/chat-model-errors.md) and the reconciled live plan in `DOCS/`.

## Priority 1 — Visible progress and predictable controls

### Rate-limit and retry feedback

Problem: release records describe approximately 30-second waits with no explanation. These waits are distinct from invalid-request errors.

Work: display waiting/retrying status, attempt count and provider retry time when known; keep cancellation responsive; distinguish 400, 401/403, 429, transport failures and 5xx; avoid retrying a permanently invalid payload.

Acceptance: a fixture returns 429 followed by success; the TUI explains the delay and can cancel before retry. A 400 produces an actionable error without an endless retry loop. Do not hardcode historical account limits.

### Model and settings persistence

Problem: `-m` saves the model although its help describes a session choice.

Proposed behavior: one-run CLI overrides remain temporary; explicitly saving a default is a separate action. Document precedence for CLI flags, environment, saved settings and project settings. Preserve key precedence already verified by the preview.

Acceptance: launch with a temporary model, exit, restart and retain the saved default; a deliberate save survives restart. The owner can choose a different persistence policy before implementation.

### Command and branding consistency

Work: resolve single-word prompt parsing, remove misleading Cline-facing account/exit text from Shri UX while preserving legal attribution, and label or hide unsupported commands. Reconcile README install-tag language with observed npm dist-tags.

Acceptance: help and menus describe actual supported behavior; both single-word and multiword prompts work through the npm shim. Unsupported surfaces explain their status before entering a broken flow.

## Priority 2 — Document and verify existing customization

Prefer making inherited features usable over recreating them.

| Surface | Existing implementation | Proposed deliverable | Acceptance |
|---|---|---|---|
| Instructions | `AGENTS.md`, rule discovery, `--system` | Shri guide with precedence and scope | Two projects load their own rules; global/project behavior is explicit |
| Skills | Skill loader, runtime slash commands, `/skills` | Example review/debug/documentation skills | A packaged installation discovers and executes a local skill |
| Themes | `apps/cli/src/tui/themes.ts`, `/theme` | Clear theme selection and optional Shri palette | Selection persists; light/dark terminals remain readable |
| Execution policy | Plan mode, tool approval, hooks, worktrees | Documented investigation/editing configurations | Plan mode blocks mutations; approvals and hooks behave as described |
| Context | Basic/agentic/off compaction | Explain tradeoffs and show context state | Long sessions compact and resume without lost tool relationships |
| Session controls | History, fork, checkpoints, undo | Verified recovery workflow | Restore and fork preserve unrelated user work and session identity |
| Storage | `--config`, `SHRI_DIR` | Isolated setup examples | Separate configurations never overwrite one another |

Source-level discovery is not proof of installed support. Use disposable fixtures, particularly for hooks, undo and worktree operations.

### Proposed named profiles

After precedence is stable, consider `review`, `build`, and `debug` profiles that group model, instructions, tools, approval policy and context behavior. Profiles should reuse existing configuration rather than introduce another independent settings store. They must show effective settings and support temporary overrides. This is a feature proposal, not a claim that profiles already exist.

## Priority 3 — Reduce request cost and measure reliability

Work:
- Measure actual prompt/tool/history token usage per request and latency to first token.
- Remove repeated instructions and pass only relevant tool schemas where the engine supports this safely.
- Keep necessary permissions, workspace instructions and tool-result context intact.
- Build a small repeatable evaluation set: explain a repository, read a file, edit a fixture, run a test, handle a failed command, and resume a conversation.
- Report real completion/error/cancellation outcomes; do not substitute token estimates for measured usage.

Acceptance: compare the same bounded fixtures before and after optimization; retain task correctness and show the measured token/latency change. Live account limits are runtime facts, not fixed product constants.

## Priority 4 — Real orchestration

Before implementation, decide how the custom coordinator will use the SDK's existing delegated-agent/team runtime. Avoid maintaining two unrelated execution and session engines.

Deliver in independently demonstrable increments:
1. Real coordinator planning and actual single-worker execution through existing tools.
2. Structured results tied to real tool evidence; explicit failure and partial-success states.
3. Durable run records, restart/recovery, and actual usage accounting.
4. Enforced per-run budgets, cancellation propagation, and provider-aware rate limits.
5. Dependency-aware scheduling and bounded concurrency only after serial execution is reliable.
6. File ownership/worktree isolation and conflict handling for concurrent edits.
7. Real fallback decisions, final synthesis, and user-visible progress.

Acceptance: a reproducible task produces actual changed files or inspected evidence, respects its budget, survives a controlled interruption, and never reports simulated success. Additional workers must improve a measured outcome rather than merely increase calls.

## Priority 5 — Expand supported integrations and platforms

- MCP: honor the original V1 exclusion until the owner explicitly expands scope; then test authentication, timeouts, tool discovery and installed execution.
- Plugins: verify packaged module resolution and compatibility before advertising third-party loading.
- Editor/ACP, schedules, connectors and dashboard: select by owner need; each needs its own installed acceptance journey. Their presence in source does not commit Shri to supporting them.
- Linux/macOS: add one native build/install/PTY gate per advertised architecture before publishing its package.
- Release automation: prove npm trusted publishing on a real release and test the registry artifact, retaining exact-tarball integrity checks.
- Stable version line (owner idea, 08/10/2026): after the `0.1.0-next.N` previews prove out, release a plain version such as `0.2.0` under npm `latest`. Needs, without breaking preview releases: `release.yml` preflight accepting plain `x.y.z` as well as `-next.N`, the publish step choosing `latest` for plain versions and `next` for previews, and RELEASE.md gates updated to match.

## Documentation and scope discipline

Reconcile completed release evidence with unchecked items in `DOCS/PLAN.md`; preserve its append-only history. Before substantial feature expansion, capture the owner's selected outcomes and exclusions in a requirements document. Do not convert every proposal here into an automatic implementation commitment.

Every promoted feature needs: documented behavior, focused regression coverage, installed acceptance evidence, and a clear update path from the current global installation. Editing the checkout alone does not change the installed executable.

## Assessment record — 24/09/2026

Inspected CLI entry/commands, terminal command registry and themes, model selection, provider conversion/routing, instruction discovery, tool presets, custom orchestration modules, release workflows and project status/work logs. Previous-turn live registry queries confirmed both package tags at `0.1.0-next.1`; `npm ls -g @shrinivas-sn/shri --depth=0` and `shri --version` matched. No new feature implementation or full-suite verification was performed.
