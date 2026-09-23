# Shri

Shri is a coding agent that runs in your terminal, built from the Apache-2.0-licensed Cline codebase. It uses a Groq API key that you supply. Your prompts, and the project context the agent reads, are sent to Groq for inference. Shri is not affiliated with Cline.

## Install

The preview is published for Windows x64 and needs Node.js 22.15 or newer:

```sh
npm install -g @shrinivas-sn/shri@next
shri
```

The [package README](apps/cli/README.md) covers first-run key setup, usage, Groq rate limits, where data is stored, and what the preview does not cover. Linux and macOS packages will be added only after they pass installed-package testing on those systems.

## Development

Install the locked dependencies with Bun 1.3.14, then run the CLI from source with `bun run shri`. Release gates and publishing steps are in [docs/RELEASE.md](docs/RELEASE.md).

The custom multi-agent pipeline in this repository is unfinished and is not shipped. Cline's connectors, dashboard and third-party plugin loading are not part of the tested preview.

## License

Source and modifications are under [Apache-2.0](LICENSE). Upstream attribution for the npm packages is in [apps/cli/NOTICE](apps/cli/NOTICE).
