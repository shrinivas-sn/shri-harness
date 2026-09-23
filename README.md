# Shri

Shri is a terminal-first, single-agent coding assistant built from the Apache-2.0-licensed Cline codebase. It uses a Groq API key supplied by the user; prompts and context sent for inference leave the machine for the configured provider. Shri is not affiliated with Cline.

The first npm preview is being prepared for Windows x64 as `@shrinivas-sn/shri@next`. Do not treat this source checkout or the current local tarballs as a published release. Linux and macOS packages will be added only after native installed-package testing on those systems.

For local development, install the locked dependencies with Bun 1.3.14 and run `bun run shri`. The CLI source and current preview boundaries are described in [apps/cli/README.md](apps/cli/README.md). Release gates and publication steps are in [docs/RELEASE.md](docs/RELEASE.md).

Shri currently exposes the working single-agent CLI. The custom multi-agent pipeline in this repository is scaffolding, not a shipped orchestration feature. Upstream connectors, dashboard, and third-party plugin loading are not part of the validated preview surface.

Source and modifications are under [Apache-2.0](LICENSE). Upstream attribution for generated npm packages is preserved in [apps/cli/NOTICE](apps/cli/NOTICE).
