# Shri CLI preview

Shri is a terminal-first, single-agent preview that uses your configured Groq Cloud API key. It is not a custom multi-agent product: the upstream team/orchestration paths are deferred and are not part of this preview.

The source is derived from Cline and retains its upstream Apache-2.0 attribution and notices.

## Preview status

This repository is source-only until generated Shri packages have passed the release and installed-artifact checks. Do not install or publish `@cline/cli`; the planned public preview package is `@shrinivas-sn/shri` on the `next` tag.

For a local Windows package after `bun run build:platforms:single`, run `bun run package:release --target windows-x64` from `apps/cli`. This writes `dist/npm/shri` and `dist/npm/shri-windows-x64` without publishing. The generator also accepts `linux-x64` and `darwin-arm64` when their compiled artifacts are present. Public publication remains gated on tarball and installed-platform verification.

## Local development

Run the checked-out CLI with Bun:

```sh
bun run shri
```

Use `shri auth` to set or replace a saved Groq key. Normal startup uses the following order without persisting temporary overrides:

1. `--key`
2. nonblank `GROQ_API_KEY`
3. saved Shri setting
4. interactive onboarding

State defaults to `~/.shri`. Use `--config <path>` for an explicit directory, or set `SHRI_DIR`; `--config` takes precedence. Your selected provider/model, settings, logs, sessions, and hub discovery are intended to remain in that Shri directory rather than `~/.cline`.

## Usage

```sh
shri                         # interactive terminal UI
shri "Explain this project" # single prompt
shri --help                  # flags and commands
shri --update                # explicit Shri preview update check
```

Provider requests are sent to the provider you configure. This preview disables inherited upstream telemetry/error export and automatic updates. Never put a real API key in a command history, source file, artifact, or log.

## Development note

The repository still contains upstream connector, dashboard, and orchestration code while packaging work is in progress. Those entrypoints are not public Shri release commands, and custom multi-agent execution remains deferred.

Third-party plugin loading is not advertised for this preview. Its sandbox bootstrap still has host SDK module imports that require installed-package verification and packaging work before support can be claimed.

## License and attribution

Shri source modifications are distributed under Apache-2.0. See the repository license and upstream notices for Cline attribution.
