# Shri V1: Terminal-First Multi-Agent Orchestration Harness

**Date:** 2026-09-21  
**Target Repository:** `E:\shri-harness`  
**Command:** `shri`  
**Base Platform:** Extracted from Cline Engine & CLI  

---

## V1 Core Principle
> **"Build the orchestration first. Simplify the inherited platform second."**  
> The first milestone is proving that Shri's coordinator-led dynamic multi-agent architecture works reliably on top of Cline's proven engine without breaking existing tool execution or test suites.

---

## 1. Purpose
Shri is a lightweight terminal-first multi-agent orchestration harness built on top of Cline's existing CLI/TUI and agent engine. The goal is not to build another generic coding agent, but rather a specialized assistant for repeatable everyday tasks:
- Lightweight research & diagnostics
- Repository & file analysis
- Git and log analysis
- Workflow planning & structured tool execution
- Routine developer workflows

The primary objective is practical multi-agent orchestration while keeping inference cost, latency, and token overhead low.

## 2. CLI Identity & Ergonomics
- **Terminal command:** `shri` (e.g., `shri` for interactive TUI, `shri "analyze this repo"` for direct prompt).
- **Target environment:** Terminal/TUI only. No desktop GUI or Tauri layer in V1.

## 3. Foundation & Engine Preservation
Shri V1 is built by cleanly extracting and extending Cline's existing CLI/TUI and core agent engine:
- Preserve the proven engine: execution loop, process/shell handling, tool plumbing, streaming/events, context/session mechanics, and unit tests.
- Rebranding, aggressive dependency removal, and TUI simplification happen only after Shri's orchestration works reliably.

## 4. Core Architecture & Topology
- **Flow:** `User → Coordinator → Plan → User Approval → Sub-agents → Coordinator → Final Result`
- Only the Coordinator controls orchestration. Sub-agents cannot spawn other agents.
- **Topology:** Strictly flat (`Coordinator → Sub-agent A, B, C`). No recursive agent trees.

## 5. Coordinator
The central reasoning layer.
- **Responsibilities:** Understand user request, decompose tasks, create the upfront plan, classify task requirements, select capabilities, determine verification needs, evaluate results, and synthesize the final response.
- Does not execute operational tools itself; delegates to ephemeral sub-agents.
- **Model:** Fixed strong reasoning model on Groq: `openai/gpt-oss-120b`.

## 6. Coordinator Output Protocol
Produces a compact structured plan containing:
- Tasks & dependencies
- Task requirement profiles (reasoning, context, priority)
- Required capabilities & tool tags
- Model requirements
- Verification requirements
- Estimated budget & time
The CLI renders this structure into a human-readable plan view in the terminal.

## 7. Dynamic Ephemeral Sub-agents
No permanent roles are hardcoded (no static "Coder", "Reviewer"). Ephemeral specialists are generated dynamically:
- Lifecycle: `Create → Assign → Execute → Return Structured Result → Destroy`
- Agents are stateless and temporary.

## 8. Context Isolation
Sub-agents do not receive the entire conversation history. The Coordinator sends a minimal task-specific context packet (task, relevant context, allowed tools, constraints, expected output). Reduces tokens, distraction, and hallucinations.

## 9. Model Registry & Router
Sub-agent models are selected dynamically based on capability metadata:
- Reasoning capability, speed, tool-calling support, context window, rate limits, quota, provider availability.
- V1 starts with Groq cloud models:
  - Coordinator: `openai/gpt-oss-120b` (131k context, high reasoning)
  - Heavy sub-agents: `llama-3.3-70b-versatile`
  - Fast/lightweight sub-agents: `llama-3.1-8b-instant` (30k TPM, high daily limit)

## 10. Model Router Fallback
If a model becomes unavailable, exceeds budget, or fails repeatedly, the Model Router selects a compatible alternative automatically. Fallback logic is centralized in the Model Router.

## 11. Task Requirement Profile
Every task created by the Coordinator includes metadata:
- `reasoning`: low / medium / high
- `context requirement`
- `expected output size`
- `priority`
- `required tools/capabilities`

## 12. Compact Tool Registry
Tools are registered with concise capability tags:
- `fs.read → filesystem / read-only`
- `git.log → git / read-only`
- `web.search → web / network`
- `shell.exec → system / state-changing`
The Coordinator sees only concise tags. Full schemas are sent only to the assigned worker agent, drastically saving tokens.

## 13. Dynamic Tool Assignment
Sub-agents receive only the tools they need. No universal "god-agents".

## 14. Mutation Permissions
Initial user intent defines permission boundaries:
- "Analyze, don't modify" → Read-only tools granted.
- "Find and fix" → Write tools granted upon confirmation.

## 15. Minimal V1 Scope
MCP and large external plugin ecosystems are excluded from V1. Uses small native tools (`fs`, `git`, `shell`) to minimize overhead.

## 16. Upfront Planning Strategy
One complete upfront plan:
`Request → Coordinator planning → Complete plan → User approval → Execution`
No autonomous endless replanning in V1.

## 17. Pre-execution Plan View
Shows the user before execution:
- Planned sub-agents & task purposes
- Selected models & assigned tools
- Estimated tokens & estimated execution time
- Total budget & execution order

## 18. User Approval Gate
No plan executes automatically. User reviews and can:
- `Approve`
- Revise via natural language (e.g., *"Don't use web search and reduce token budget"*). Coordinator regenerates plan until approved.

## 19. Execution Scheduler
Simple, model-aware concurrency:
- Independent agents run in parallel only when safe.
- Does not run multiple token-heavy agents concurrently against the same constrained model.
- Schedules based on model, provider limits, estimated tokens, and remaining quota.

## 20. Budget Manager
Strict resource limit tracking:
- RPM, TPM, daily request quota, daily token quota (e.g., 200k daily ceiling on `gpt-oss-120b`), context windows, actual tokens consumed, max retries.

## 21. Simple Verification
Binary toggle in Coordinator output: `verify: true | false`. When enabled, creates a dedicated verifier sub-agent. No complex contradiction engine in V1.

## 22. Standardized Agent Communication Protocol
Every sub-agent returns a structured envelope:
```json
{
  "status": "success | error | blocked",
  "summary": "High level explanation",
  "evidence": "Log snippet, diff, or output reference",
  "confidence": "high | medium | low",
  "warnings": [],
  "result_payload": { /* task-specific data */ }
}
```

## 23. Observability
Terminal displays Coordinator planning, agent creation, assigned models/tools, real-time status, token consumption, fallback alerts, verification status, and final synthesized answer.

## 24. Run Persistence
Every completed run is saved locally as JSON: request, plan, revisions, models used, tools assigned, token metrics, errors, and structured results.

## 25. Stateless Memory
V1 is stateless between runs. Each command starts with fresh context.

## 26. Session Model
One active user run at a time. Multiple simultaneous sessions are out of scope.

## 27. Configuration & Secrets
API keys (Groq `gsk_...`) stored securely in environment variables (`GROQ_API_KEY`), never committed to source control.

## 28. Testing & Quality Gates
- Preserve Cline's existing Vitest test suite and conventions as regression protection.
- Add focused Shri unit tests for: Coordinator schemas, Model Router, dynamic tool assignment, budgeting, scheduling, approval loop, structured envelope, and run persistence.

## 29. V1 Execution Path
`User request → Coordinator analysis → Structured plan → Plan view in terminal → User approval/revision → Dynamic sub-agent creation → Model + tool assignment → Budget-aware execution → Optional verification → Coordinator synthesis → Final answer → Local history saved`

## 30. Explicitly Out of Scope for V1
- Desktop GUI / Tauri app
- Persistent cross-run memory
- Recursive agent trees
- MCP plugin ecosystem
- Autonomous endless replanning

---

## Repository Extraction Plan (`E:\shri-harness`)

### What to Copy:
1. `apps/cli` (CLI terminal TUI, prompts, commands, test suites)
2. `apps/cline-hub` (Background daemon & coordinator)
3. `sdk/packages` (`core`, `agents`, `llms`, `shared`, `sdk`)
4. Root build configs (`package.json`, `bun.lock`, `tsconfig.json`, `biome.json`)

### What to Exclude (Saves 97% storage, ~1GB down to ~25MB):
1. `.git` (Replace with fresh `git init`)
2. `apps/vscode` & `apps/vscode-rollout`
3. `apps/examples/desktop-app`
4. `docs/` & `assets/`
5. `evals/`
6. `node_modules` (Clean `bun install` in new repo)
