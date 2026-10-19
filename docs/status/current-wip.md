# Current work

2026-10-19: accepted eight reliability findings repaired in the current working tree.

Completed: index-based checks, effective-spec/task-local workflow, per-task fresh evidence, Node CLI, installation lifecycle, hook preservation, isolated worktree configuration and OpenCode agent registration. No commit, push, publication or installation into the user's active repositories was performed.

Verification mapping: ../knowledge/K4-implementation/bridge-reliability.md. Architecture: ../architecture/system-card.md. Regression suite: ../../tests/bridge.test.mjs.

Architecture documentation synchronized: Node.js >=20 CLI, no runtime npm dependencies, shared workflow contract and explicit host boundaries. No pending architecture backwrite.

Validation limits: live host integration has not been run; Linux/macOS permission behavior requires the POSIX-only test in that environment. Package contents were verified using bundled pnpm pack --dry-run --json (npm is absent from execution PATH).

Final verification: node --test tests/bridge.test.mjs completed with 32 tests: 31 passed, 0 failed, 1 POSIX-only permission test skipped on Windows. Workflow pressure review passed all four scenarios. JavaScript/shell syntax, JSON contracts, default-blocking templates, package contents and git diff --check also passed.

2026-10-19 comprehensive audit is active (maximum five rounds), with exit criteria and per-round evidence in ../audit/2026-10-19-review.md. R1–R3 repairs strengthened integrity, managed-path containment, report schemas, fingerprints and Markdown block ownership. Final verification pending latest-artifact regression and confirmatory reviews.

Comprehensive audit completed after 5 rounds: rounds1–3 repaired substantive defects, rounds4–5 were clean. Final actual run: 53 tests, 51 pass, 0 fail, 2 explicit platform/privilege skips; packed-artifact integration, syntax, JSON/contracts and whitespace passed. See ../audit/2026-10-19-review.md for fixed exit criteria, findings, evidence and remaining environment limits. No open P0/P1/P2 findings in reviewed scope; no pending production work from this audit. Changes remain uncommitted.

Release preparation 2026-10-19: version 2.0.0 synchronized across package and plugin manifests. CHANGELOG.md includes incompatible changes, migration, repairs, validation and remaining environment limits, and is included in the distributed package. Actual v2.0.0 tarball and extracted installed CLI/plugin smoke checks passed (2 targeted tests, 0 failures). The prior latest-code full regression remains 53 tests: 51 passed, 0 failed, 2 disclosed skips; runtime code was unchanged during release preparation.


Full lifecycle extension completed 2026-10-19 (uncommitted): six skills now delegate native explore/proposal before context/planning/implementation review/final verification. Read-only route and spec-fingerprint commands support initial intake and recovery. ready requires fresh upstream receipts, exact task-ID coverage, and final workspace evidence bound to context/planning report contents. Independent review exposed one mapping-mutation bypass; regression reproduced it before the fix and now passes.

Final validation: 67 tests, 65 passed, 0 failed, 2 disclosed Windows skips (POSIX disabled-hook permissions and file-symlink privilege). Real packed-artifact extraction/install/doctor/route/spec-fingerprint/plugin registration passed. Five revised prompt pressure scenarios passed; JavaScript, shell, JSON and diff whitespace checks passed. Live native OpenSpec host invocation remains untested. No version bump, commit/push or global installation performed for this extension. Design and plan: ../superpowers/specs/2026-10-19-full-lifecycle-design.md and ../superpowers/plans/2026-10-19-full-lifecycle.md.
