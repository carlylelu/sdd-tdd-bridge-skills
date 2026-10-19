# Reliability repair verification mapping

| Accepted finding | Implementation | Verification |
|---|---|---|
| Task review required all future scenarios | task_assertions plus deferred_integration, task-local compliance | Four workflow pressure scenarios, including cross-task integration |
| Baseline and delta conflict | effective spec operation rules | 30-minute baseline changed to 15-minute delta pressure scenario |
| Staged checks read worktree | Git index snapshot and staged content reads | Invalid index/valid worktree and valid index/invalid worktree regression tests |
| Hooks/install could silently fail | Node hooks, install/doctor/uninstall, prior-hook chaining | Missing runtime rejection, real commit, hook edits, reinstall and worktree tests |
| Keyword false positives/negatives | Per-scenario blocks, exact scope headings, explicit placeholder markers | Generics/HTML, uppercase keywords, incomplete second scenario, missing specs, partial deletion |
| Reports overwritten or stale | Task-indexed JSON, fingerprint, ready | Reports excluded from fingerprint, source-change invalidation, final command failure rejection |
| Excessive approval and unclear repair owner | Shared result states and repair back to implementation | Previously authorized failure-recovery pressure scenario |
| Mechanical tests/commits and missing association | Risk-based tests, independent commit units, Change-Id for implementation commits | Workflow review and implementation-only commit tests |

Report templates default to BLOCKED. A PASS flag is not proof that a command ran; the host must retain actual logs and review evidence. The checker enforces consistency and freshness only.

Packaging validation uses the bundled pnpm pack --dry-run --json because npm is not available in the execution PATH. This is a packaging check only; no package publication or external installation was performed.

Final local result (2026-10-19): 32 tests, 31 PASS, 0 FAIL, 1 POSIX-only SKIP on Windows. Real git commit enforcement, all original-hook preservation, home-path expansion and worktree configuration isolation passed. Workflow pressure review passed; syntax, JSON/template checks and package dry-run passed. Live host sessions and Linux/macOS execution remain unverified.

Comprehensive follow-up: ../../audit/2026-10-19-review.md records five rounds, additional integrity/schema/Markdown repairs and final latest-code 53-case validation (51 passed, 0 failed, 2 explicit environment skips). Earlier 32-case results above are historical, not the final audit baseline.

## Full lifecycle extension (2026-10-19)

Separate source and workspace freshness: code edits should not force requirement replanning, while task progress must not invalidate spec context. Normalize task checkbox progress only in the spec hash; retain raw bytes in the final workspace hash. Require fresh context/planning at archive as well as during routing so new final reports cannot bypass stale upstream interpretation. Existing native artifacts bypass optional exploration/proposal receipts. Proxy skills must discover and delegate native host capabilities, never emulate slash commands in shell.
