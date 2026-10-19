# Bridge reliability repair implementation plan

Goal: repair all eight accepted review findings without replacing the four-stage architecture.

1. Add regression tests using temporary Git repositories and node --test; first demonstrate failures against existing checks.
2. Implement Node format and commit checks with Git index snapshots, structured Markdown checks, safe change names and Git worktree support. Preserve wrapper commands.
3. Add install/doctor/uninstall with existing-hook chaining, ownership checks and executable modes. Register the OpenCode agent along with skills.
4. Add fingerprint and report validation commands; define task-indexed evidence, source invalidation and final gate requirements.
5. Rewrite agent and skills around a shared contract: effective specs, task-local scope, final aggregate, risk-based tests and repair routing.
6. Update README, packaging and templates. Run node --test, package dry-run, diff checks, shell syntax and document contract checks. Record results and limitations.

Execution stays in this chat and current clean checkout. No automatic commit, push or host-global hook installation.
