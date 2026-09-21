> Superseded on 22/09/2026. Preserved verbatim below for historical reasoning. Its Node-runtime recommendation, completion claims, and direct-publish instructions are not the current execution plan. See DOCS/PLAN.md.

# NPM Packaging & Distribution Plan: `@shrinivas-sn/shri`

This document provides complete technical reference, context, and structural analysis for packaging and publishing the **Shri** CLI agent harness as an npm package under the scope `@shrinivas-sn/shri`.

---

## 1. Package Specifications

| Attribute | Specification |
|---|---|
| **Package Name** | `@shrinivas-sn/shri` |
| **Global CLI Command** | `shri` |
| **Target Registry** | `https://registry.npmjs.org/` |
| **Access Level** | `public` (mandatory for npm scoped packages: `--access public`) |
| **Repository Path** | `E:\shri-harness` |
| **CLI Package Path** | `E:\shri-harness\apps\cli` |
| **Toolchain** | Bun 1.3.14 (package manager + task runner + bundler), Node >= 22 runtime |
| **License** | Apache-2.0 |

---

## 2. Monorepo Structure & Dependencies

The repository is structured as a Bun workspace with the following layout:

```
E:\shri-harness\
├── package.json               # Monorepo root (@shri/packages)
├── sdk\
│   └── packages\
│       ├── core\              # Agent logic, tools, hub clients, state
│       ├── shared\            # Storage resolvers, utilities, protocols
│       ├── llms\              # LLM providers, stream parsers, models
│       ├── agents\            # Agent definition runtime
│       └── sdk\               # Public SDK surface
├── apps\
│   ├── cli\                   # Terminal harness (target for @shrinivas-sn/shri)
│   │   ├── package.json       # CLI manifest
│   │   ├── bun.mts            # Bun ESM bundler script
│   │   ├── src\
│   │   │   ├── index.ts       # Main executable entrypoint
│   │   │   ├── main.ts        # CLI argument parser and session bootstrap
│   │   │   └── shri\          # Custom Shri layer (Groq auth, storage, router, tools)
│   │   ├── dist\              # Compiled artifacts output
│   │   └── script\            # Build and publish scripts
│   └── cline-hub\             # Background daemon & web dashboard
```

### Workspace Dependency Resolution
- SDK packages (`@cline/core`, `@cline/shared`, `@cline/llms`, etc.) are declared in `apps/cli/package.json` as `workspace:*`.
- They compile their exports into `dist/`. Running `bun run build:sdk` from repo root builds all SDK dependencies.
- During production bundling via `apps/cli/bun.mts`, Bun is configured with `packages: "bundle"`. This **inlines all internal workspace packages into `dist/index.js`**, ensuring that end-users installing from npm do not need private `@cline/*` workspace packages published to npm.

---

## 3. Packaging Approaches

There are two viable architectures for publishing:

### Approach A: Standalone ESM Node/Bun Package (Recommended)
- **Concept:** Bundle all workspace code into a single ESM file (`dist/index.js`) with production runtime dependencies installed via npm.
- **How it runs:**
  - `npx @shrinivas-sn/shri` (installs and executes immediately)
  - `npm install -g @shrinivas-sn/shri` (installs global `shri` command)
- **Runtime requirements:** Node.js >= 22 or Bun >= 1.2 on the user's machine.
- **External Dependencies:** Only native/runtime modules that cannot be bundled (e.g. `@opentui/core`, `@opentui/react`, `react`, `@agentclientprotocol/sdk`).
- **Advantages:** Lightweight package size, platform-independent, rapid build cycle, zero cross-compilation complexity.

### Approach B: Multi-Platform Compiled Binaries (Upstream Cline Pattern)
- **Concept:** Compile standalone native platform executables (`shri.exe` on Windows, `shri` on Linux/macOS) using `bun build --compile`.
- **Packaging Structure:**
  - 6 platform packages: `@shrinivas-sn/shri-linux-x64`, `@shrinivas-sn/shri-linux-arm64`, `@shrinivas-sn/shri-darwin-x64`, `@shrinivas-sn/shri-darwin-arm64`, `@shrinivas-sn/shri-windows-x64`, `@shrinivas-sn/shri-windows-arm64`.
  - 1 root wrapper package (`@shrinivas-sn/shri`) specifying each platform package in `optionalDependencies` and dispatching via a small wrapper script.
- **Advantages:** Users do not need Node or Bun installed.
- **Drawbacks:** Requires cross-platform build matrix, native FFI pre-compilation for OpenTUI, and managing 7 published packages on npm.

---

## 4. Technical Findings & Build Blockers Discovered

During build exploration, three specific configuration hurdles were identified:

### 1. Cline Hub Webview Build Failure in `apps/cli/bun.mts`
- **Issue:** `apps/cli/bun.mts` contains a check:
  ```ts
  if (shouldBuildHubWebview()) {
      console.log("Building Cline Hub webview...");
      await $`bun -F @cline/cline-hub build:webview`.cwd(repoRoot);
  }
  ```
  `apps/cline-hub/src/webview` is a sub-project that requires `vite`, `@tailwindcss/vite`, and `@vitejs/plugin-react-swc`. Because `apps/cline-hub/src/webview` is not registered in the root `workspaces` array in root `package.json`, running `bun install` at the root does not install its dependencies. This causes `tsc -b && vite build` to fail with `Cannot find type definition file for 'vite/client'`.
- **Resolution Options:**
  - *Option 1:* Add `"apps/cline-hub/src/webview"` to `workspaces` in root `package.json` and run `bun install`.
  - *Option 2:* For terminal-only CLI distribution, skip or decouple the webview build check in `apps/cli/bun.mts` when building standalone CLI packages.

### 2. Upstream Direct Publish Guard
- **Issue:** `apps/cli/package.json` has:
  ```json
  "prepack": "bun script/guard-direct-publish.ts",
  "prepublishOnly": "bun script/guard-direct-publish.ts"
  ```
  `guard-direct-publish.ts` halts direct `npm publish` execution with:
  `"Direct packaging or publishing from apps/cli is disabled."`
- **Resolution:** Set environment variable `CLINE_ALLOW_DIRECT_PUBLISH=1` or adjust `apps/cli/package.json` scripts prior to publishing.

### 3. Binary Entrypoint Field in `package.json`
- **Current Development Setting:**
  ```json
  "bin": {
      "shri": "src/index.ts"
  }
  ```
- **Required Production Setting:**
  ```json
  "bin": {
      "shri": "./dist/index.js"
  }
  ```
  `src/index.ts` only works when executed by Bun in development mode. For npm distribution, it must point to the compiled `dist/index.js`.

### 4. Shebang Directive
- `apps/cli/src/index.ts` begins with `#!/usr/bin/env bun`.
- For standard Node.js users running via npm/npx, this requires Bun unless the compiled `dist/index.js` uses `#!/usr/bin/env node` and relies only on Node 22+ compatible ESM APIs.

---

## 5. Required Configuration Changes

### File: `apps/cli/package.json`
```json
{
  "name": "@shrinivas-sn/shri",
  "displayName": "shri",
  "version": "0.1.0",
  "description": "Terminal-First Autonomous Coding Agent powered by Groq",
  "type": "module",
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/shrinivas-sn/cline.git",
    "directory": "apps/cli"
  },
  "keywords": [
    "shri",
    "agent",
    "groq",
    "coding-agent",
    "opentui",
    "cli",
    "autonomous"
  ],
  "author": {
    "name": "Shrinivas S N"
  },
  "license": "Apache-2.0",
  "bin": {
    "shri": "./dist/index.js"
  },
  "engines": {
    "node": ">=22"
  },
  "main": "dist/index.js",
  "files": [
    "dist"
  ]
}
```

---

## 6. Verification and Publishing Commands Reference

### Step 1: SDK Compilation
```bash
# Must be executed from repository root
bun run build:sdk
```

### Step 2: CLI Bundle Compilation
```bash
# In apps/cli
bun run build
# Or from root:
bun -F @cline/cli build
```

### Step 3: Local Global Testing
```bash
# Test local global installation before npm publish
cd apps/cli
npm install -g .
# Verify from any terminal outside repo:
shri --version
shri --help
```

### Step 4: NPM Registry Authentication & Publishing
```bash
# Ensure logged in to npm under user account shrinivas-sn
npm whoami

# Dry run preview (verifies included files and tarball contents)
cd apps/cli
npm pack --dry-run

# Publish public scoped package
npm publish --access public
```

