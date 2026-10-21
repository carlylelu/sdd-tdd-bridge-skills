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


2026-10-21 OpenSpec setup guidance: clarified CLI vs per-project host initialization, explicit init --tools mappings/core profile, conditional CLI installation, stale instruction updates, host reload/discovery and authorization boundaries. Official OpenSpec installation/CLI/supported-tools docs checked on this date; no runtime behavior or version change. Shared contract plus both proxy skills, main agent and README synchronized. Focused packed-artifact installation and OpenCode registration tests: 2 passed, 0 failed; initial sandbox git-init denial resolved by running isolated temporary-repository tests with approved permissions. No global installation or project initialization performed.

Recovery prompt pressure re-test: all five scenarios passed (CLI installed/uninitialized project; CLI absent; stale CLI/initialized project; unknown host ID; generated-but-unloaded Skills under bypass pressure). No blocking findings.


2026-10-21 full flow-control repair completed in working tree. Actual writing-plans produces the plan; Bridge report only references/hashes/maps it. Native executor/TDD/review/final verification and spec-before-quality order are explicit, with finishing/authorization boundaries. Plan file and receipt validation, meaningful mapping checks and forced ignored-report fingerprints close known bypasses. Maximum three-round audit completed; independent final round found no new P1/P2 in scope. Actual final regression: 74 total, 73 pass, 0 fail, 1 POSIX-only Windows skip; real package installation and installed CLI/plugin smoke passed. JS/shell/JSON/whitespace checks passed. See ../audit/2026-10-21-flow-control.md. No release/commit/push/global install. Live native business-host flow remains untested; old report schema additions require actual re-planning/re-review.


2.2.0 release preparation 2026-10-21: version synchronized across package and plugin manifests; changelog finalized with 2.1.x migration requirements. User authorized commit and GitHub push. Release verification uses a fresh 2.2.0 tarball and complete regression; prior audit records retain their historical uncommitted status.

2.2.0 final release verification: fresh source/package manifest versions all 2.2.0; actual packed-artifact full suite 74 tests, 73 pass, 0 fail, 1 POSIX-only skip. Installed runtime including plan-fingerprint and plugin registration passed. JS/JSON/whitespace checks passed; four shell entry points passed syntax checks outside the sandbox after Git Bash DLL initialization was blocked inside it.


2026-10-21 checker-path repair complete in working tree: current full plugin checker is bound separately from target repo; runtime preflight is read-only, optional Hook state is independent, and all six Skills plus agent use absolute entry/target binding with fail-closed errors. OpenCode injects package path. Regression: fresh packaged full suite 77 tests, 76 pass, 0 fail, 1 POSIX-only skip; six pressure scenarios PASS, independent review no new P1/P2. See ../audit/2026-10-21-runtime-resolution.md. No release/commit/push/global install or business-project configuration change.


2.2.1 release preparation 2026-10-21: user authorized version update, commit and GitHub push. Package/plugin manifests and README synchronized; changelog finalized. Prior no-release statements describe historical task boundaries. Fresh 2.2.1 tarball is used for release regression.

2.2.1 final release verification: source/tarball manifest versions consistent; fresh full regression with actual 2.2.1 package completed with 77 tests, 76 pass, 0 fail, 1 POSIX-only skip. Packed pre-install checks, runtime metadata, optional hook diagnostics and OpenCode path injection passed. JavaScript syntax and staged whitespace checks are part of release validation.
