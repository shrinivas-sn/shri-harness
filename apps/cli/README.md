# Shri CLI

<p align="center">
  <img src="https://github.com/user-attachments/assets/7123f9d1-afeb-48d5-93fa-e750dec0ebba" width="70%" />
</p>

Run Shri in your terminal. Interactive chat for paired sessions, or fully headless for CI/CD and scripting.

> **Preview status.** Shri is a single-agent preview built on the Cline CLI engine, defaulting to Groq (`openai/gpt-oss-120b`) for fast, free inference. Sub-agent spawning, agent teams, and the custom multi-agent pipeline described in this repository's developer docs are **not enabled in this preview** — they're present in source for later work but excluded from public release commands. Everything else on this page (auth, TUI, MCP, schedules, connectors) runs on the same underlying engine as Cline CLI and behaves the same way.

## Install

```sh
npm install -g @shrinivas-sn/shri@next
```

Platform binaries are published as optional dependencies; `@shrinivas-sn/shri` resolves the correct one for your platform at install time. See [DOCS/RELEASE.md](../../DOCS/RELEASE.md) for supported platforms and current release status.

## Quick start

Run interactively:

```sh
shri
```

Run a single prompt:

```sh
shri "Audit this package and propose fixes"
```

Pipe input:

```sh
cat file.txt | shri "Summarize this"
```

See `shri --help` for the full flag reference.

## Providers

Shri defaults to Groq. You can also bring an API key from Anthropic, OpenAI, Google Gemini, OpenRouter, AWS Bedrock, GCP Vertex, Cerebras, or any OpenAI-compatible endpoint.

```sh
shri auth                              # interactive sign-in (Groq by default)
shri auth --provider anthropic --apikey sk-... --modelid claude-sonnet-4-6
```

`shri auth` without a provider opens the interactive auth setup TUI, with Groq presented as the recommended option.

OAuth-supported providers (`cline`, `openai-codex`, `oca`) do not auto-launch a browser on normal startup. Authenticate explicitly first with `shri auth <provider>`. For non-interactive runs, if an OAuth provider is selected and no saved credentials are available, `shri` fails fast with an authentication message instead of launching a hidden browser flow.

## Modes

- Interactive TUI: `shri` or `shri -i` opens a full terminal UI with plan/act toggle, slash commands, file mentions, and live tool approvals
- One-shot: `shri "your prompt"` runs a single turn and exits
- JSON: `shri --json "..."` streams NDJSON events for piping into other tools
- Yolo: `shri --yolo "..."` skips approval prompts and exits when the turn finishes
- Zen: `shri --zen "..."` fires the task to the background hub daemon and exits immediately (see below)

## Headless mode for CI/CD

```sh
# One-shot prompt, auto-approve all tools
shri --yolo "Run tests and fix any failures"

# Pipe a diff in for review
git diff origin/main | shri "Review these changes for issues"

# NDJSON output for downstream tooling
shri --json "List all TODO comments" | jq -r 'select(.type == "agent_event" and .event.text) | .event.text'
```

## Features

- Streaming TUI built on [OpenTUI](https://github.com/sst/opentui) with markdown rendering, syntax-highlighted diffs, scrollable chat, and mouse support
- Plan/Act mode toggle for switching between planning and execution
- Native MCP support for connecting custom tools
- Checkpoints with `/undo` to rewind workspace state
- OAuth login for Cline, ChatGPT Subscription (`openai-codex`), and OCA
- Configurable thinking budgets per run
- Cron and event-driven schedules for recurring agent work
- Chat connectors for Telegram, Google Chat, and WhatsApp

Not in this preview: sub-agent spawning, agent teams, and real multi-agent orchestration. The `shri:pipeline` entrypoint exists in source only and is excluded from public release commands.

## Usage

```sh
# Start Shri CLI without a prompt to enter interactive mode
shri

# Single prompt (one-shot)
shri "Audit this package and propose fixes"

# Interactive mode with a starting prompt
shri -i "Let's work on this together. First, analyze the current state."

# With a custom system prompt
shri -i -s "You are a pirate" "Tell me about the sea"

# Require approval before each tool call
shri --auto-approve false "Inspect and modify this repository"

# Explicit yolo: enables submit_and_exit
shri --yolo --retries 5 "Refactor this package"

# Override consecutive internal mistake (retry) limit (default: 3)
shri --retries 5 "Fix failing tests"

# Show verbose run stats (elapsed time, tokens, estimated cost when available)
shri -v "Explain quantum computing"

# Use a specific provider, model, and access token for a single prompt
shri -P openrouter -m google/gemini-3-pro -k sk-... "Set up a storybook"

# Use a different model with the last used provider
shri -m anthropic/claude-opus-4-6 "Explain string theory"

# Stream structured NDJSON output
shri --json "Summarize this repository"

# Quick provider setup
shri auth --provider anthropic --apikey sk-... --modelid claude-sonnet-4-6
shri auth --provider openai-native --apikey sk-... --modelid gpt-5 --baseurl https://api.example.com/v1
```

### MCP servers

Manage MCP servers with the interactive wizard:

```sh
shri mcp
shri config mcp
```

Open the add-server wizard with the name, transport, and command or URL already filled in with `shri mcp install` (`shri mcp add` also works). Stdio servers use everything after `--` as the command and arguments:

```sh
shri mcp install fs -- npx -y @modelcontextprotocol/server-filesystem /tmp
```

Remote HTTP and SSE servers take a name, transport, and URL. The wizard still asks for auth details before saving:

```sh
shri mcp install ctx7 --transport http https://mcp.context7.com/mcp
shri mcp install events --transport sse https://example.com/sse
```

Because this command opens the wizard, it requires a TTY.

### Connectors

Bridge a chat surface into RPC-backed Shri sessions. Each conversation thread maps to a session with full context. Supported platforms: Telegram, Slack, Google Chat, WhatsApp, and Linear.

```sh
# Telegram (polling mode)
shri connect telegram -k 123456:ABCDEF...

# Slack (webhook mode)
shri connect slack --bot-token $SLACK_BOT_TOKEN --signing-secret $SLACK_SIGNING_SECRET --base-url https://your-domain.com

# Slack (socket mode)
shri connect slack --bot-token $SLACK_BOT_TOKEN --app-token $SLACK_APP_TOKEN

# Google Chat (webhook mode)
shri connect gchat --base-url https://your-domain.com

# WhatsApp (webhook mode)
shri connect whatsapp --base-url https://your-domain.com

# Linear (webhook mode)
shri connect linear --api-key $LINEAR_API_KEY --base-url https://your-domain.com

# Stop connector bridges and delete their sessions
shri connect --stop
shri connect --stop telegram
```

In chat surfaces, connector slash commands include `/help`, `/start`, `/new`, `/clear`, `/whereami`, `/tools`, `/yolo`, `/cwd <path>`, `/schedule`, `/abort`, and `/exit`. Run `shri connect <adapter> --help` to see the full flag list for any adapter.

### Schedules

Schedule agents on cron-like intervals or external events.

If `--provider` and `--model` are omitted, schedules use the last configured
provider and model. If only `--provider` is given, the schedule uses that
provider's saved model.

```sh
shri schedule create "Daily code review" \
  --cron "0 9 * * MON-FRI" \
  --prompt "Review PRs opened yesterday and summarize issues." \
  --workspace /path/to/repo \
  --timeout 3600 \
  --tags automation,review

shri schedule list
shri schedule get <schedule-id>
shri schedule trigger <schedule-id>
shri schedule history <schedule-id> --limit 20
shri schedule export <schedule-id> > daily-review.yaml
shri schedule import ./daily-review.yaml
```

Schedules can route results back to chat surfaces with `--delivery-adapter`, `--delivery-bot`, and `--delivery-thread`.

## Options

| Flag | Description |
|------|-------------|
| `-s, --system <prompt>` | Override the system prompt |
| `-P, --provider <id>` | Provider id (default: `groq`) |
| `-m, --model <id>` | Model id (default: `openai/gpt-oss-120b` on Groq) |
| `-k, --key <api-key>` | API key override for this run |
| `-p, --plan` | Run in plan mode (default is act mode) |
| `-i, --tui` | Interactive TUI multi-turn mode |
| `-t, --timeout <seconds>` | Optional run timeout in seconds |
| `-c, --cwd <path>` | Working directory for tools |
| `--config <path>` | Configuration directory (used for CLI home resolution) |
| `--hooks-dir <path>` | Additional hooks directory hint for runtime hook injection |
| `--acp` | ACP (Agent Client Protocol) mode |
| `--thinking [none\|low\|medium\|high\|xhigh]` | Model thinking level when supported. Defaults to `medium` when the flag is provided without a level; thinking is off when the flag is omitted. |
| `--compaction <agentic\|basic\|off>` | Context compaction mode. Defaults to `agentic`; use `basic` for local truncation or `off` to disable. |
| `--retries <count>` | Maximum consecutive mistakes (retries) before halting (default: `3`) |
| `--json` | Output NDJSON instead of styled text |
| `--data-dir <path>` | Use isolated local state at `<path>` instead of `~/.shri/data` (enables sandbox mode automatically) |
| `--auto-approve [true\|false]` | Set tool auto-approval for all tools |
| `-y, --yolo` | Skip tool approval prompts, enable `submit_and_exit` |
| `-z, --zen` | Dispatch the task to the background hub and exit the CLI immediately |
| `--team-name <name>` | Override the runtime team state name |
| `-h, --help` | Show help and exit |
| `-v, --verbose` | Show verbose runtime diagnostics |
| `-V, --version` | Show version and exit |

`--json` is non-interactive and requires either a prompt argument or piped stdin. `--key` takes precedence over environment variables.

## Top-level commands

- `shri config` - Open the interactive config view
- `shri history|h [options]` - List session history or manage saved sessions
- `shri version` - Show CLI version
- `shri update [options]` - Check for updates to `@shrinivas-sn/shri`
- `shri auth <provider>` - Authenticate or seed provider credentials
- `shri connect <adapter>` - Run a chat connector bridge (`telegram`, `gchat`, `whatsapp`)
- `shri connect --stop [adapter]` - Stop connector bridge processes and their sessions
- `shri schedule <command>` - Create and manage scheduled runs
- `shri doctor` - Inspect local CLI health and stale processes
- `shri doctor fix` - Kill stale local RPC listeners and old CLI processes
- `shri doctor log` - Open the CLI runtime log file
- `shri hook` - Handle a hook payload from stdin
- `shri hub` - Manage the local hub daemon

## Zen mode

`--zen` (alias `-z`) runs a task in the background hub daemon and exits the CLI immediately. It is intended for long-running tasks you want to fire off and walk away from.

```sh
shri --zen "Refactor the authentication module and add unit tests"
```

Behavior:

- The CLI starts (or reuses) the local hub daemon, submits the task, then exits. It does not stream output or stay attached to the session.
- Because there is no human in the loop once the CLI exits, zen sessions run with full tool auto-approval (same semantics as `--yolo`).
- If the menubar app is not running, there is no live UI for the task. Use `shri history` later to find the session and inspect the result.
- `--zen` is incompatible with `--data-dir` (the implicit sandbox requires a local backend that exits with the CLI) and with `--tui` (there is no terminal UI to render into).

## Tool approval

Tool calls are auto-approved by default. Use `--auto-approve false` to require review before tool execution.

```sh
shri --auto-approve false "Inspect and modify this repository"
```

When approval is required, the CLI prompts in TTY mode:

```text
Approve tool "<tool_name>" with input <preview>? [y/N]
```

- Enter `y` or `yes` to approve.
- Enter anything else (or press Enter) to reject.
- If stdin/stdout is not a TTY, required-approval calls are denied in terminal mode.

## Environment variables

- `ANTHROPIC_API_KEY` - API key for Anthropic
- `GROQ_API_KEY` - API key for Groq (the default provider)
- `OPENAI_API_KEY` - API key for OpenAI (when using `-P openai`)
- `OPENROUTER_API_KEY` - API key for OpenRouter (when using `-P openrouter`)
- `AI_GATEWAY_API_KEY` - API key for Vercel AI Gateway (when using `-P vercel-ai-gateway`)
- `V0_API_KEY` - API key for v0 (when using `-P v0`)
- `SHRI_DIR` - Root configuration and data directory (default `~/.shri`)
- `CLINE_DATA_DIR` - Base data directory for sessions/settings/teams/hooks (advanced override; prefer `SHRI_DIR`)
- `CLINE_SANDBOX` - Set to `1` to force sandbox mode
- `CLINE_SANDBOX_DATA_DIR` - Override sandbox state directory
- `CLINE_TEAM_DATA_DIR` - Override team persistence directory
- `CLINE_LOG_ENABLED` - Set to `0`/`false` to disable runtime file logging
- `CLINE_LOG_LEVEL` - Runtime log level (`trace|debug|info|warn|error|fatal|silent`, default `info`)
- `CLINE_LOG_PATH` - Runtime log file path (default `<data dir>/logs/cline.log`)
- `CLINE_DEBUG` - Set to `1`/`true` to print wrapper diagnostics (e.g. the CA bundle summary)

`--key` takes precedence over environment variables.

## Certificate trust

The CLI automatically trusts your operating system's certificate store, so it
works behind corporate TLS-inspecting proxies and with self-signed/internal
endpoints without any setup. On launch the wrapper harvests the OS trust
anchors and writes them to `~/.shri/cli-node-extra-ca-certs.pem`, then points
the runtime's `NODE_EXTRA_CA_CERTS` at that bundle. The file is regenerated when
it changes and is safe to delete (it is rebuilt on the next run).

If you set `NODE_EXTRA_CA_CERTS` yourself, your certificates are **merged** into
that bundle alongside the system store rather than replacing it. Run with
`CLINE_DEBUG=1` to see how many OS and user CAs were loaded and where the bundle
was written.

## Contributing

See [DEVELOPMENT.md](./DEVELOPMENT.md) for local development setup, monorepo structure, and TUI architecture.

## Credits

Shri is built on the [Cline](https://github.com/cline/cline) CLI engine. See [DOCS/PLAN.md](../../DOCS/PLAN.md) for what's changed in this preview and what remains deferred.

## License

[Apache 2.0 © Cline Bot Inc.](https://github.com/cline/cline/blob/main/LICENSE)
