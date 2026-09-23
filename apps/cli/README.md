# Shri

Shri is a coding agent that runs in your terminal. It reads files, runs commands and edits code in your project, using a Groq model (default: `openai/gpt-oss-120b`) with your own Groq API key.

This is an early preview. Shri is built from the Apache-2.0 [Cline](https://github.com/cline/cline) codebase and is not affiliated with Cline.

## Requirements

- Windows x64. Linux and macOS packages are not available yet.
- Node.js 22.15 or newer.
- A Groq API key. Create one at [console.groq.com/keys](https://console.groq.com/keys).

## Install

```sh
npm install -g @shrinivas-sn/shri@next
```

The preview is published on the `next` tag, so `@next` is required. npm also installs `@shrinivas-sn/shri-windows-x64`, which contains the Shri program itself. Bun is not needed.

To try Shri without installing it globally:

```sh
npx @shrinivas-sn/shri@next
```

## First run

```sh
shri
```

The first time you run it, Shri asks for your Groq API key and saves it. To replace a saved key later, run:

```sh
shri auth
```

For one run only, you can supply a key with `--key` or the `GROQ_API_KEY` environment variable. When more than one is set, Shri uses the first of these:

1. `--key`
2. `GROQ_API_KEY`
3. The saved key

A key given with `--key` or `GROQ_API_KEY` is not saved.

## Usage

```sh
shri                              # open the interactive terminal UI
shri "explain this project"       # run a single prompt, then exit
shri -c path/to/project "fix the failing test"   # work in another folder
shri -m openai/gpt-oss-20b "..."  # use a different Groq model
shri history                      # list past sessions
shri --help                       # all flags and commands
```

In the interactive UI, type `/model` to search and switch Groq models. A model chosen with `-m` also becomes your saved default for future runs, not only the current one.

**The agent acts on your files.** A prompt passed on the command line runs with tool auto-approval on by default, so Shri can edit files and run shell commands without asking. Run it in a folder under version control, or pass `--auto-approve false`.

Quote a prompt that is a single word (`shri "hi"`). Otherwise Shri reads the word as a command name.

## Groq rate limits

Groq's free tier currently allows 6,000–8,000 tokens per minute per model. Every Shri step sends about 4,500 tokens, so a task with several steps quickly uses up the minute's allowance. Shri then waits until Groq accepts the request, often 30 seconds or more per step, and the screen does not show that it is waiting. Short questions stay fast. For longer tasks, a paid Groq plan raises the limit.

## Data and privacy

- Your prompts, plus the file contents and command output the agent reads, are sent to Groq for inference.
- Settings, your saved key, session history and logs are stored in `~/.shri`. To use another folder, pass `--config <path>` or set `SHRI_DIR`; `--config` wins when both are set.
- Cline's telemetry and error reporting are turned off in Shri, and so are automatic updates.

Do not paste API keys into prompts, source files or shell history.

## Updating and uninstalling

```sh
npm install -g @shrinivas-sn/shri@next   # update to the latest preview
npm uninstall -g @shrinivas-sn/shri      # remove Shri
```

To remove your saved settings and history as well, delete `~/.shri`.

## What this preview does not cover

`shri --help` also lists commands inherited from Cline, such as `kanban`, `dashboard`, `connect`, `plugin`, `schedule` and `mcp`. None of them have been tested in this preview. Loading third-party plugins is not supported yet, and the multi-agent pipeline in the source repository is unfinished.

## Reporting problems

Open an issue at [github.com/shrinivas-sn/shri-harness/issues](https://github.com/shrinivas-sn/shri-harness/issues). Include your `shri --version` output and the command you ran. Never include your API key.

## Developing Shri

Source code, build instructions and release checks are in [the repository](https://github.com/shrinivas-sn/shri-harness). With the repository checked out and Bun 1.3.14 installed, run the CLI from source with `bun run shri`.

## License

Apache-2.0. Shri is derived from Cline; the package's `NOTICE` file contains the upstream attribution.
