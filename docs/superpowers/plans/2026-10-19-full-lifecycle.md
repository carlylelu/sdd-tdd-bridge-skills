# Full lifecycle implementation plan

1. Add failing workflow/CLI tests for initial routing, upstream fingerprints, receipts and final-gate bypass prevention. Capture old-skill pressure baseline.
2. Implement shared report validation, upstream dependency fingerprints, receipt checks and read-only route; wire ready and installer integrity; keep native invocation in host skills.
3. Add EXPLORE/PROPOSAL proxy skills and reports, update main agent/shared/downstream contracts, all discovery manifests and adapter descriptions.
4. Update README, Unreleased changelog and architecture/WIP. Add fixture coverage for new commands to extracted artifact.
5. Run focused tests, full prior regression and actual package integration; pressure re-test revised prompts; independently review changed runtime and resolve findings.

No global skill installation, automatic commit/push or release-version bump is part of this task. User-approved design is docs/superpowers/specs/2026-10-19-full-lifecycle-design.md.
