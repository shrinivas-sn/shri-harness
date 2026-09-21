# Shri V1 Implementation Plan

- **Target Repository:** `E:\shri-harness`
- **Spec / PRD Reference:** [`DOCS/CONTEXT/PRD.md`](file:///E:/shri-harness/DOCS/CONTEXT/PRD.md)
- **Primary Goal:** Build the Coordinator-led, dynamic multi-agent orchestration harness on top of the preserved Cline CLI engine with zero AI slop, strict token budgeting, and Groq model routing.

---

## Directory & File Architecture (`apps/cli/src/shri/`)

All new orchestration logic lives in a self-contained, modular package inside `apps/cli/src/shri/` so the existing Cline engine remains untouched:

```text
apps/cli/src/shri/
├── types.ts                     # Core interfaces (TaskProfile, Plan, Envelope, Budget)
├── coordinator/
│   ├── coordinator.ts           # Upfront plan generator & synthesis
│   ├── prompt.ts                # Compact planning system prompt
│   └── coordinator.test.ts      # Unit tests with schema validation
├── router/
│   ├── router.ts                # Model Router & capability matching
│   ├── registry.ts              # Groq model catalog & limits
│   └── router.test.ts           # Routing & fallback unit tests
├── scheduler/
│   ├── budget.ts                # BudgetManager (RPM, TPM, 200k daily ceiling)
│   ├── scheduler.ts             # Model-aware queue & concurrency manager
│   └── scheduler.test.ts        # Concurrency & throttling unit tests
├── tools/
│   ├── compact-registry.ts      # Lightweight capability tags for Coordinator
│   ├── tool-assignment.ts       # Dynamic tool filter (git, fs, shell)
│   └── tools.test.ts            # Capability assignment unit tests
├── agent/
│   ├── envelope.ts              # Standard response envelope parser & validator
│   ├── context-packet.ts        # Minimal task context packet builder
│   └── agent.test.ts            # Envelope & packet unit tests
├── persistence/
│   ├── run-history.ts           # Local JSON run logging
│   └── persistence.test.ts      # Audit log unit tests
└── index.ts                     # Main shri pipeline runner
```

---

## Task 1: Type Definitions & Core Schemas

### Goal
Define all TypeScript interfaces and Zod schemas for Task Profiles, Plans, Envelopes, and Budgets.

### Files
- Create: `apps/cli/src/shri/types.ts`
- Create: `apps/cli/src/shri/types.test.ts`

### Step-by-Step
1. Write failing test in `types.test.ts` verifying Zod schemas for `TaskRequirementProfileSchema`, `PlanSchema`, and `SubAgentEnvelopeSchema`.
2. Run `bun -F @cline/cli test:unit src/shri/types.test.ts` (verify failure).
3. Implement `types.ts` with Zod schemas and TypeScript types.
4. Run tests to confirm passing.
5. Git commit: `feat(shri): define core orchestration types and schemas`.

---

## Task 2: Compact Tool Registry & Dynamic Tool Assignment

### Goal
Implement Section 12 & 13 of the PRD: Coordinator sees only compact capability tags (`fs.read -> filesystem / read-only`), while sub-agents receive only assigned tools.

### Files
- Create: `apps/cli/src/shri/tools/compact-registry.ts`
- Create: `apps/cli/src/shri/tools/tool-assignment.ts`
- Create: `apps/cli/src/shri/tools/tools.test.ts`

### Step-by-Step
1. Write failing unit tests in `tools.test.ts` testing capability tagging and intent-based tool filtering.
2. Run test (verify failure).
3. Implement `compact-registry.ts` and `tool-assignment.ts`.
4. Verify all tests pass.
5. Git commit: `feat(shri): implement compact tool registry and dynamic assignment`.

---

## Task 3: Model Registry & Router with Automatic Fallback

### Goal
Implement Sections 9 & 10: Model capability catalog (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) and automatic fallback logic on model error or quota exhaustion.

### Files
- Create: `apps/cli/src/shri/router/registry.ts`
- Create: `apps/cli/src/shri/router/router.ts`
- Create: `apps/cli/src/shri/router/router.test.ts`

### Step-by-Step
1. Write tests in `router.test.ts` verifying that:
   - High reasoning tasks route to `openai/gpt-oss-120b` or `llama-3.3-70b`.
   - Low reasoning/fast tasks route to `llama-3.1-8b`.
   - Failing models fall back to the next compatible candidate.
2. Implement model capability registry and router.
3. Run tests and verify passing.
4. Git commit: `feat(shri): implement Model Router with capability matching and fallback`.

---

## Task 4: Budget Manager & Execution Scheduler

### Goal
Implement Sections 19 & 20: Track RPM, TPM, and daily token limits (200k ceiling for GPT-OSS-120B); enforce model-aware concurrency so heavy tasks do not trigger HTTP 429 rate limits.

### Files
- Create: `apps/cli/src/shri/scheduler/budget.ts`
- Create: `apps/cli/src/shri/scheduler/scheduler.ts`
- Create: `apps/cli/src/shri/scheduler/scheduler.test.ts`

### Step-by-Step
1. Write tests in `scheduler.test.ts` verifying token quota tracking and sequential queueing for same-model tasks.
2. Implement `budget.ts` and `scheduler.ts`.
3. Run tests and verify passing.
4. Git commit: `feat(shri): implement BudgetManager and Model-Aware Execution Scheduler`.

---

## Task 5: Coordinator Planning & Response Synthesis

### Goal
Implement Sections 5, 6, 16, & 21: Coordinator generates complete upfront plan in strict JSON; synthesizes final response from sub-agent envelopes.

### Files
- Create: `apps/cli/src/shri/coordinator/prompt.ts`
- Create: `apps/cli/src/shri/coordinator/coordinator.ts`
- Create: `apps/cli/src/shri/coordinator/coordinator.test.ts`

### Step-by-Step
1. Write unit tests with mock LLM outputs testing JSON plan extraction, schema validation, and synthesis.
2. Implement prompt definitions and `Coordinator` class.
3. Run tests and verify passing.
4. Git commit: `feat(shri): implement Coordinator upfront planning and synthesis`.

---

## Task 6: Standardized Sub-Agent Envelope & Context Packet

### Goal
Implement Sections 8 & 22: Isolated context packet generation for sub-agents and standardized response envelope parsing.

### Files
- Create: `apps/cli/src/shri/agent/context-packet.ts`
- Create: `apps/cli/src/shri/agent/envelope.ts`
- Create: `apps/cli/src/shri/agent/agent.test.ts`

### Step-by-Step
1. Write tests verifying context packets omit unrelated conversation and envelopes parse status, summary, evidence, and payload.
2. Implement packet builder and envelope handler.
3. Run tests and verify passing.
4. Git commit: `feat(shri): implement context isolation and standard response envelope`.

---

## Task 7: Run Persistence & Audit Log

### Goal
Implement Section 24: Save completed runs locally as JSON (original request, plan, approved model/tools, token usage, errors, result).

### Files
- Create: `apps/cli/src/shri/persistence/run-history.ts`
- Create: `apps/cli/src/shri/persistence/persistence.test.ts`

### Step-by-Step
1. Write tests for saving and loading run records.
2. Implement local JSON history storage in user application data dir.
3. Run tests and verify passing.
4. Git commit: `feat(shri): implement local run persistence and audit logging`.

---

## Task 8: End-to-End Orchestrator Pipeline & CLI Wiring

### Goal
Implement Section 29: Connect the full 11-step pipeline (`User request -> Coordinator -> Plan -> Approval -> Sub-agents -> Synthesis -> Save`) into a runnable `shri` command.

### Files
- Create: `apps/cli/src/shri/index.ts`
- Update: `apps/cli/package.json` (bin entry for `shri`)
- Create: `apps/cli/src/shri/e2e.test.ts`

### Step-by-Step
1. Write integration test exercising the full mock pipeline.
2. Wire `shri` pipeline into CLI entrypoint.
3. Run all tests: `bun -F @cline/cli test:unit src/shri/`.
4. Git commit: `feat(shri): wire complete Shri V1 orchestration pipeline and binary`.
