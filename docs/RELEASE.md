# Windows preview release

The first release is `@shrinivas-sn/shri@0.1.0-next.0` on npm's `next` tag, with one optional platform package: `@shrinivas-sn/shri-windows-x64` at the same version. Only Windows x64 is advertised. Linux x64/glibc and macOS arm64 stay in the build model but require their own native installed tests before publication.

The source package `@cline/cli` is private and must never be published. Build and publish only the generated, inspected tarballs. Never bypass its direct-publish guard or include a real Groq key in build, CI, artifacts, logs, or a command line.

## Gates before publishing

1. Worktree changes are reviewed, typechecked, and tested for the supported CLI surface. Record any broad-suite failures separately; a focused pass is not a broad pass.
2. A Windows x64 native build generates only the Windows wrapper/platform packages. `verify:release` checks both tarballs, their repository metadata, credentials, attribution, embedded assets, and SHA-256 report.
3. The same tarballs pass the isolated installed E2E suite, including real PTY startup, `/model`, auth replacement, loopback provider failures/recovery, history, tools, and daemon isolation.
4. A user enters a Groq key locally for one separate live installed-package interaction. CI never has this key.
5. The public GitHub commit and exact version tag pass `.github/workflows/release.yml` with `publish=false`. The build job uploads its tested tarballs and verification report; the publish job does not rebuild.
6. Check `check-publish-inputs.mjs` against the downloaded artifact and confirm its exact package names, version, Windows-only target set, paths, checks, sizes, and hashes. Verify the npm account and public repository identity before the irreversible publish.

For the first publish, these package names may require an interactive npm/2FA bootstrap before trusted publishing can be configured. Publish the verified platform tarball first, then the wrapper, both with `--access public --tag next --ignore-scripts`. Do not publish from `apps/cli` or from generated directories, and do not use the default `latest` tag. If npm requires 2FA, complete it locally without sharing the code or a token in chat. Once both packages exist, configure each package's trusted publisher for `shrinivas-sn/shri-harness` and `.github/workflows/release.yml`, allowing direct `npm publish`; later tagged prereleases may use `publish=true` and OIDC. The workflow pins Node 24 and npm 11.5.1 for that path.

After publishing, install `@shrinivas-sn/shri@next` from the registry into a fresh Windows x64 prefix with lifecycle scripts disabled and no Bun on the runtime PATH. Repeat the installed smoke checks and verify the npm `next` dist-tag and package integrity. Record the actual versions, hashes, CI run, and registry results in `PLAN.md`/`STATUS.md` before calling the preview published and verified.

A published name/version cannot be replaced. If either package fails or a partial publication occurs, stop, inspect registry state, and prepare a new prerelease version; do not unpublish as a routine rollback.

Current npm references: [scoped public publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), [trusted publishing](https://docs.npmjs.com/trusted-publishers/), [provenance](https://docs.npmjs.com/generating-provenance-statements/), and [dist-tags](https://docs.npmjs.com/adding-dist-tags-to-packages/).
