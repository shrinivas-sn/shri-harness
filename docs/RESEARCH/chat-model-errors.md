# Chat and model-selection errors: diagnosis

Investigated 24/09/2026 against source at `bb640bf` and installed `@ai-sdk/openai-compatible@3.0.37`. Published preview: `0.1.0-next.1`.

## Finding 1 — Assistant reasoning is replayed using an unsupported field

Recorded user error: `'messages.2' ... property 'reasoning_content' is unsupported`. `DOCS/STATUS.md` records failures on a second user message with both GPT-OSS sizes. This is an invalid request, distinct from a rate-limit wait.

The source trace is:
1. Groq is registered with the `openai-compatible` family in `sdk/packages/llms/src/providers/builtins.ts`.
2. `toGatewayRequestMessages` in `providers/compat.ts` converts stored `thinking` blocks into `reasoning` parts.
3. `buildAiSdkRequestMessages` in `providers/ai-sdk.ts` calls `shouldIncludeReasoningHistory`. That predicate currently excludes only Cerebras, so Groq history retains reasoning.
4. `toAiSdkMessages` preserves those reasoning parts.
5. `providers/vendors/openai-compatible.ts` constructs the installed generic adapter. Its request transform currently handles max-completion-token naming, not Groq history compatibility.
6. The adapter's `src/chat/convert-to-openai-compatible-chat-messages.ts` concatenates reasoning and writes it onto the assistant message as `reasoning_content`.

The first request has no prior assistant reasoning. Subsequent requests can contain it, which explains the turn-dependent trigger. Switching models inside that same conversation can retain the offending history; choosing another model alone is not a reliable repair.

### Controlled reproduction performed

Ran an in-memory Node script through `node --input-type=module`, importing the actual installed adapter. A synthetic `fetch` returned success for the first request and a 400 when a request included `reasoning_content`. It made no network calls, read no real API key, and wrote no settings.

Actual output:

```text
second_turn_error=property 'reasoning_content' is unsupported
[
  { "turn": 1, "assistantMessageKeys": [] },
  { "turn": 2, "assistantMessageKeys": [["role", "content", "reasoning_content"]] }
]
```

This proves the installed adapter's serialization and reproduces the reported failure against a deliberately strict fixture. It is not a fresh live Groq reproduction or a full TUI reproduction. The provider rejection itself is supported by the existing user/release record.

### Repair direction

Apply provider-specific request-history compatibility at the gateway boundary, using the existing history policy seam. Preserve stored/displayed reasoning, assistant text, tool-call IDs/results and other providers' signatures. Avoid globally deleting reasoning or clearing existing sessions. Use the SDK routing conventions in `sdk/packages/llms/AGENTS.md`; choose the narrow policy implementation after adding a gateway request-capture regression.

`portable-reasoning.ts` controls request effort, not serialization of historical assistant content. Changing only its effort value will not remove `reasoning_content` from history.

## Finding 2 — Groq's picker uses catalog choices rather than account discovery

In `apps/cli/src/tui/hooks/use-model-selector.tsx`, `usesModelIdInput` returns true only for `openai-compatible`. The endpoint `/models` fetch is gated by that predicate. Groq therefore builds choices from `config.knownModels` rather than this authenticated endpoint-list path.

This explains how catalog entries can appear even when unavailable to the configured endpoint/account. The current helper also reads saved credentials; reusing it unmodified would overlook temporary CLI/environment credentials. Discovery must use the effective session configuration without persisting temporary secrets.

Repair direction: reconcile live model IDs with catalog capability metadata, show discovery failures honestly, and preserve the current choice on cancellation/failure. `/models` membership is necessary availability evidence, not proof of chat/tool compatibility or guaranteed access for every operation. Keep audio/moderation-only entries out of coding choices; unknown metadata needs an explicit conservative policy.

## Finding 3 — Reasoning controls can outlive model capability

`normalizeReasoningRequest` in `providers/routing/reasoning-options.ts` preserves a broadly normalized effort when `context.model.reasoningOptions` is undefined. `resolvePortableReasoning` treats Groq as a reasoning-capable provider and can forward that effort. The release record reports a model rejecting `reasoning_effort`.

Missing capability metadata must not be treated as proof that every Groq model accepts a reasoning parameter. The exact selected-model payload remains to be pinned with a request-capture regression.

Official Groq reasoning documentation currently distinguishes GPT-OSS effort values (`low`, `medium`, `high`) from Qwen controls. Response reasoning format and request history format are also separate concerns. Do not generalize one model family's options across the provider.

## Verification matrix for the repair

| Journey | Required observation |
|---|---|
| Fresh GPT-OSS conversation, three turns | No unsupported history field; previous answer still available |
| Reasoning plus tool-call continuation | Tool call/result pairing preserved; continuation accepted |
| Resume an existing saved reasoning session | History unchanged on disk; next request normalized |
| Switch 120b to 20b after a reply | Conversation continues with the selected model |
| Switch to non-reasoning or unknown-capability model | Unsupported effort omitted; UI reflects actual controls |
| Switch provider | Providers requiring reasoning/signatures retain their behavior |
| Model discovery with temporary credentials | Effective key/endpoint used; saved configuration unchanged |
| Discovery timeout, 401/403, malformed response | Clear failure/cached-state labeling; prompt remains usable |
| Listed audio or moderation model | Excluded from coding choices |
| Installed executable | Same behavior through real npm shim, PTY and restart |

## Evidence limits

No application code was changed. No live prompts were sent, no user key was read, and the user's saved model/history were not modified. The installed adapter reproduction is narrower than an end-to-end fix. Existing broad inherited test failures remain unresolved unless separately diagnosed.

## Sources

- Local source anchors named above; installed dependency manifest reports version `3.0.37`, while the workspace manifest permits `^3.0.27`.
- [Groq reasoning documentation](https://console.groq.com/docs/reasoning), read 24/09/2026.
- [Groq models documentation](https://console.groq.com/docs/models), read 24/09/2026.
- [Current project status](../STATUS.md), recorded live user failure and model observations.
- [Product roadmap](../CONTEXT/ROADMAP.md), separately proposed future work.
