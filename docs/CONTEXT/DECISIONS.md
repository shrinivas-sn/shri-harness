# Decisions log

Append-only. One line per decision — what was chosen and the one-line why. Don't edit past entries; add a new one if a decision changes and note what it supersedes.

- 2026-09-21: Extracted lean CLI + Hub + SDK from Cline into `E:\shri-harness` — avoids 1GB bloat while keeping proven execution engine and tests intact.
- 2026-09-21: Coordinator fixed on Groq `openai/gpt-oss-120b` with flat sub-agent topology — keeps reasoning strong while avoiding recursive agent trees and rate-limit exhaustion.
- 2026-09-21: Excluded MCP and desktop GUI from V1 — keeps scope minimal, focused on terminal analysis and diagnostics.
