# Full lifecycle orchestration design

User-approved direction: proxy OpenSpec exploration/proposal through the Bridge entry point and continue through planning, implementation, validation and archive.

## Boundaries

Keep the four existing downstream skills and add bridge-explore-skill and bridge-proposal-skill. They discover and delegate to native host OpenSpec capabilities; they do not emulate a missing native skill, execute chat slash commands in a shell, silently resolve product tradeoffs, or write business code during exploration. Native exploration defaults to read-only; artifact capture requires authorization. Native proposal/update/continue owns upstream artifacts.

## Routing

A read-only `route --repo <root> [--change <name>] [--intent auto|explore|propose]` returns a suggested stage, evidence and reasons, never stage approval. No change routes to EXPLORE; multiple unresolved candidates require selection. Partial/invalid artifacts route to PROPOSAL. Complete valid artifacts route to LOAD_CONTEXT, then PLANNING or IMPLEMENT_TASK based on current upstream receipts. All completed tasks route to DUAL_VERIFY; only an actually passing ready gate permits ARCHIVE. Explicit upstream intent is honored within user authorization. Semantic demand clarity is assessed by the native skill, not guessed from filenames.

## Freshness

`spec-fingerprint` hashes baseline specs, selected change artifacts, OpenSpec project config and repository guardrails. It normalizes line endings and checkbox completion markers in tasks.md, preserving IDs/descriptions and all other content. Context/planning receipts record spec_fingerprint and real evidence. Plan task IDs must cover exactly the current task list. A change invalidates downstream receipts without deleting historical files. The final gate independently requires fresh context and planning; fresh task/verify records alone cannot bypass changed upstream inputs.

Workspace fingerprints remain conservative for final implementation/verification. New modules context.mjs (dependency fingerprints/upstream receipts), workflow.mjs (routing), reports.mjs (shared report schema) reuse existing checks. The installer copies and integrity-checks these modules. Existing 2.0 upstream reports lacking spec_fingerprint must be regenerated; complete native artifacts need no retroactive explore/proposal report.

## Acceptance and validation

Cover empty/partial/complete projects, ambiguity, explicit intent, all downstream resume stages, malformed/stale upstream receipts, planning task coverage, baseline/config/guardrail edits, checkbox-only progress, and archive rejection after upstream edits. Retain prior regression/security tests; validate real package extraction/installed CLI and six-skill discovery. Pressure-test native delegation, explore-only behavior and scope changes. Preserve the distinction between fixture validation and unavailable live-host sessions.

Native references: https://github.com/Fission-AI/OpenSpec/blob/main/docs/explore.md and https://github.com/Fission-AI/OpenSpec/blob/main/docs-lab/reference/skills.md .
