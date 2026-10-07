# 26/09/2026 — Groq repair plan restructuring

Continues: [22/09/2026 work](../2026-09-22/WORK.md), the later 24/09 checkpoint in the previous plan, and [chat/model diagnosis](../../RESEARCH/chat-model-errors.md).

## Scope

The owner asked for a proper plan and explicitly said not to execute it. Continued the same unfinished repair scope in DOCS/PLAN.md. No application code, product tests/builds, live API prompts, credentials, package installation, commits, or remote writes were performed.

## Preservation and disposition

Before changing the plan, copied it to [PLAN-before-restructure.md](PLAN-before-restructure.md). Original and snapshot SHA-256 both:
B872D4E01823904427991425E8556D9700456C612FE605FBBF63781ED65CAD0F.

The snapshot is verbatim historical material. Its relative links were authored for DOCS/PLAN.md; resolve them against DOCS, and do not follow its obsolete resume header as the current queue.

Tasks 0–7 remain completed historical release work according to the later recorded evidence. Every unfinished Task 8–12 requirement is carried into the restructured plan. No unfinished scope was silently deleted or marked complete.

## Planning evidence

Read the standard plan template/execution guide, checker, current status/diagnosis, relevant SDK instructions, manifests/lockfile, history conversion, model picker, reasoning rules, inference configuration precedence, installed drivers, and CI/release workflows. Read current official Groq reasoning/models documentation; sources and dates are in the plan.

Verified required root owner via Get-Acl. Git was clean at 91b4253 before planning. Local Node/Bun were 22.15.0/1.3.14; installed adapter in sdk/packages/llms/node_modules was 3.0.37. Root and sdk-root adapter lookup paths were absent; resolving from the owning package confirmed the version and serializer.

Additional code observations: visibility rule describes GPT-OSS but matches all Groq disabled intent; modelId mutates before reasoning selection completes. Plan now includes narrow visibility and cancellation checks. Release dispatch rebuilds/verifies, so publishing-run hashes and registry evidence must be identified separately from a dry-run candidate.

## Plan structure

Five phases: outgoing history; effective model discovery/transactional selection; model-specific reasoning; installed Windows evidence; hosted/live/registry delivery. Each task defines location anchors, actions, test-first proof, verification, test-edit boundaries, failure response, and proposed commit. Added owner inputs and an empty execution Progress Log/Plan issues table.

## Verification

Passed: plan-check.js reported 5 phases and 9 complete task cards. Documentation checks confirmed local links in all four active documents, the unchanged snapshot SHA-256, one new session-index row, and tracked edits confined to docs. git diff --check passed after removing an extra EOF blank line; only existing LF/CRLF conversion warnings remain. These checks validate planning documents only, not the product repair. No commit was made.

## Resume

Await the owner's implementation request. Start Phase 1 / Task 8 after preflight; do not restart initial release tasks. Follow the new live plan and its per-phase checkpoints.
