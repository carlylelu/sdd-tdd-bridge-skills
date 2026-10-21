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

Full lifecycle extension: two native OpenSpec proxy skills (explore/proposal) precede the four downstream skills. checks/workflow.mjs provides read-only routing; checks/context.mjs computes normalized spec fingerprints and validates context/planning receipts; checks/reports.mjs owns shared report schema validation. The final gate requires fresh upstream receipts and exact task-ID coverage. Native capabilities remain owned by the host; no OpenSpec engine is embedded. Prepared native artifacts do not require upstream proxy receipts.

2026-10-21 delegation repair: planning is authored by native writing-plans, not Bridge JSON. context.mjs checks a contained regular Markdown plan and its direct SHA-256 even if ignored, native invocation roles, and meaningful task mappings. evidence.mjs requires executor/TDD/review/final-verification receipts and forces active context/planning reports into workspace fingerprints independently of Git ignore. CLI plan-fingerprint exposes the canonical artifact digest. Agent orchestrates native executor -> spec review -> native quality review; final native review/verification and ready precede any authorized archive. Receipts remain auditable Agent assertions, not cryptographic proofs of host execution.

Plugin checker resolution: read-only runtime command in install.mjs reports the actual executing checker path/package version and separate optional hook state. OpenCode injects the current package CLI path. All stage instructions resolve checker relative to the loaded complete package, use explicit absolute target --repo, and reject validate/error-swallowing fallbacks. Skill usage no longer requires per-repository install; Git Hook runtime copies remain explicit, independently diagnosed installations.
