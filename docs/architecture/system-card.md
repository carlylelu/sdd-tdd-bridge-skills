# Bridge architecture

Runtime: Node.js >=20 and Git, with POSIX sh only for Git hook execution. No npm runtime dependencies.

- checks/lib.mjs: repository validation, Git index/worktree snapshots, Markdown structure and commit association.
- checks/evidence.mjs: source fingerprints and final per-task/verification evidence validation.
- checks/install.mjs: local installation ownership, hook chaining, diagnosis and configuration restoration.
- checks/bridge.mjs: CLI routing and machine-readable results.
- .opencode/plugins/sdd-tdd-bridge.js: idempotent skill/primary-agent registration; preserves user overrides.
- skills/bridge-load-context-skill/references/workflow.md: one shared workflow contract, including effective delta semantics, task-local assertions, deferred integration and authorization-aware recovery.

Boundaries: no cryptographic authenticity proof for Agent reports; no interception of external archive calls; host discovery remains explicit. Report freshness conservatively binds the final workspace. Ignored files, external services and submodules require separate verification evidence.

Audit hardening: managed installation paths reject symlink/junction traversal; installation records validate restoration fields and store runtime SHA-256 hashes. Validating hooks verify runtime integrity independently before invoking the CLI. Fingerprints use per-file byte digests in framed JSON records. PASS reports require actual UTC timestamps, required stage/common fields and no outstanding issues. Delta checks enforce per-requirement scenario ownership and nonempty assertion lines, and distinguish removal/rename-only operations.
