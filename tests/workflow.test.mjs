import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { git, writeJSON } from '../checks/lib.mjs';
import { fingerprint, ready } from '../checks/evidence.mjs';

const cliPath = fileURLToPath(new URL('../checks/bridge.mjs', import.meta.url));
function fixture(t, kind = 'complete') {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-workflow-'));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  git(repo, 'init', '-q'); git(repo, 'config', 'core.excludesFile', path.join(repo, 'empty-ignore'));
  const base = 'openspec/changes/demo/';
  const write = (file, value) => { fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); fs.writeFileSync(path.join(repo, file), value); };
  if (kind !== 'empty') write(base + 'proposal.md', '## Scope\nLogin\n## Out-of-Scope\nBilling\n');
  if (kind === 'complete') {
    write(base + 'design.md', '## Design\nExisting module\n');
    write(base + 'tasks.md', '- [ ] 1.1 Login\n');
    write(base + 'specs/auth/spec.md', '## ADDED Requirements\n### Requirement: Login\n#### Scenario: Login\nWHEN requested\nTHEN token\n');
  }
  return { repo, base, write };
}
async function contextAPI() { return import('../checks/context.mjs'); }
async function route(f, options = {}) { return (await import('../checks/workflow.mjs')).route(f.repo, options); }
async function seedUpstream(f) {
  const spec = (await contextAPI()).specFingerprint(f.repo, 'demo').fingerprint;
  const common = { schema_version: 1, change_id: 'demo', result: 'PASS', checked_at: new Date().toISOString(), spec_fingerprint: spec, fingerprint: fingerprint(f.repo).fingerprint, evidence: ['fixture source review'], issues: [], outputs: ['fixture-report.json'], next_action: 'IMPLEMENT_TASK' };
  const context = { ...common, stage: 'LOAD_CONTEXT' };
  const plan = { ...common, stage: 'PLANNING', task_mapping: [{ task_id: '1.1', requirement_ids: ['auth/Login'], scenario_ids: ['auth/Login/Login'], verification: [{ command: 'node --test', test_ref: 'tests/login.js' }] }] };
  const save = () => { writeJSON(path.join(f.repo, 'bridge/reports/demo/context-report.json'), context); writeJSON(path.join(f.repo, 'bridge/reports/demo/planning-report.json'), plan); };
  save(); return { common, context, plan, save };
}
function seedFinal(f, common) {
  const base = path.join(f.repo, 'bridge/reports/demo');
  const current = { ...common, fingerprint: fingerprint(f.repo).fingerprint };
  writeJSON(path.join(base, 'tasks/1.1.json'), { ...current, stage: 'IMPLEMENT_TASK', task_id: '1.1', scenario_ids: ['auth/Login/Login'], implementation_refs: ['src/login.js'], test_refs: ['tests/login.js'], checks: Object.fromEntries(['scenario_coverage', 'design_compliance', 'exclusion_scope', 'regression', 'code_review'].map(k => [k, 'PASS'])) });
  writeJSON(path.join(base, 'verify-report.json'), { ...current, stage: 'DUAL_VERIFY', tasks: ['1.1'], checks: Object.fromEntries(['full_scenario_coverage', 'effective_spec_compliance', 'code_review'].map(k => [k, 'PASS'])), openspec_verify: { result: 'PASS', evidence: ['fixture review'] }, verification: [{ command: 'node --test', exit_code: 0, evidence: ['fixture tests pass'] }] });
}

test('route CLI accepts idea-only input without creating upstream artifacts', t => {
  const f = fixture(t, 'empty');
  const r = spawnSync(process.execPath, [cliPath, 'route', '--repo', f.repo], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).stage, 'EXPLORE');
  assert.equal(fs.existsSync(path.join(f.repo, 'openspec')), false);
  assert.equal(fs.existsSync(path.join(f.repo, 'bridge')), false);
});
test('route sends partial native artifacts to proposal and complete artifacts to context', async t => {
  const f = fixture(t, 'partial'); assert.equal((await route(f)).stage, 'PROPOSAL');
  f.write(f.base + 'design.md', '## Design\nExisting module\n');
  f.write(f.base + 'tasks.md', '- [ ] 1.1 Login\n');
  f.write(f.base + 'specs/auth/spec.md', '### Requirement: Login\n#### Scenario: Login\nWHEN request\nTHEN token\n');
  assert.equal((await route(f)).stage, 'LOAD_CONTEXT');
});
test('route supports native upstream intent even when artifacts already exist', async t => {
  const f = fixture(t);
  assert.equal((await route(f, { intent: 'explore' })).stage, 'EXPLORE');
  assert.equal((await route(f, { intent: 'propose' })).stage, 'PROPOSAL');
});
test('route requires selection for multiple changes and honors an explicit new name', async t => {
  const f = fixture(t); f.write('openspec/changes/other/proposal.md', 'Other');
  assert.equal((await route(f)).result, 'NEEDS_CLARIFICATION');
  const newChange = await route(f, { change: 'new-change' });
  assert.equal(newChange.stage, 'EXPLORE'); assert.equal(newChange.change_id, 'new-change');
});
test('route ignores archived changes and rejects invalid change names', async t => {
  const f = fixture(t, 'empty'); f.write('openspec/changes/archive/old/proposal.md', 'Archived');
  assert.equal((await route(f)).stage, 'EXPLORE');
  await assert.rejects(() => route(f, { change: '../bad' }), /Invalid change/);
});
test('spec fingerprint preserves checkbox progress but tracks task content and guardrails', async t => {
  const f = fixture(t); const { specFingerprint } = await contextAPI();
  const first = specFingerprint(f.repo, 'demo').fingerprint;
  f.write(f.base + 'tasks.md', '- [x] 1.1 Login\r\n');
  assert.equal(specFingerprint(f.repo, 'demo').fingerprint, first);
  f.write(f.base + 'tasks.md', '- [x] 1.1 Login with passkeys\n');
  assert.notEqual(specFingerprint(f.repo, 'demo').fingerprint, first);
  const second = specFingerprint(f.repo, 'demo').fingerprint;
  f.write('AGENTS.md', 'Use strict authentication.');
  assert.notEqual(specFingerprint(f.repo, 'demo').fingerprint, second);
});
test('spec fingerprint tracks baseline/config changes but ignores business implementation', async t => {
  const f = fixture(t); const { specFingerprint } = await contextAPI();
  let current = specFingerprint(f.repo, 'demo').fingerprint;
  f.write('src/login.js', 'business code'); assert.equal(specFingerprint(f.repo, 'demo').fingerprint, current);
  f.write('openspec/specs/auth/spec.md', '### Requirement: Existing behavior');
  assert.notEqual(specFingerprint(f.repo, 'demo').fingerprint, current);
  current = specFingerprint(f.repo, 'demo').fingerprint;
  f.write('openspec/config.yaml', 'schema: spec-driven\n');
  assert.notEqual(specFingerprint(f.repo, 'demo').fingerprint, current);
});
test('route resumes planning and implementation from fresh upstream reports', async t => {
  const f = fixture(t); const reports = await seedUpstream(f);
  fs.unlinkSync(path.join(f.repo, 'bridge/reports/demo/planning-report.json'));
  assert.equal((await route(f)).stage, 'PLANNING'); reports.save();
  const decision = await route(f); assert.equal(decision.stage, 'IMPLEMENT_TASK');
  assert.deepEqual(decision.pending_tasks, ['1.1']);
});
test('upstream content changes invalidate reports without deleting evidence', async t => {
  const f = fixture(t); await seedUpstream(f); f.write(f.base + 'design.md', '## Design\nUse a new module\n');
  const decision = await route(f);
  assert.equal(decision.stage, 'LOAD_CONTEXT'); assert.ok(decision.invalidated_stages.includes('DUAL_VERIFY'));
  assert.ok(fs.existsSync(path.join(f.repo, 'bridge/reports/demo/planning-report.json')));
});
test('malformed upstream reports are rewound and planning must cover all task IDs', async t => {
  const f = fixture(t); const reports = await seedUpstream(f);
  f.write('bridge/reports/demo/context-report.json', '{'); assert.equal((await route(f)).stage, 'LOAD_CONTEXT');
  reports.plan.task_mapping = []; reports.save(); assert.equal((await route(f)).stage, 'PLANNING');
});
test('all completed tasks require verification before archive routing', async t => {
  const f = fixture(t); const reports = await seedUpstream(f);
  f.write(f.base + 'tasks.md', '- [x] 1.1 Login\n');
  assert.equal((await route(f)).stage, 'DUAL_VERIFY');
  seedFinal(f, reports.common); assert.equal((await route(f)).stage, 'ARCHIVE');
});
test('fresh final reports cannot bypass stale upstream receipts', async t => {
  const f = fixture(t); const reports = await seedUpstream(f);
  f.write(f.base + 'tasks.md', '- [x] 1.1 Login\n');
  f.write(f.base + 'design.md', '## Design\nChanged after planning\n');
  seedFinal(f, reports.common);
  assert.throws(() => ready(f.repo, 'demo'), /spec|upstream|source|context/i);
});
test('six proxy/downstream skills are registered for Claude discovery', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../.claude-plugin/marketplace.json', import.meta.url), 'utf8'));
  assert.equal(manifest.plugins[0].skills.length, 6);
  for (const name of ['bridge-explore-skill', 'bridge-proposal-skill']) assert.ok(manifest.plugins[0].skills.some(p => p.endsWith('/' + name)));
});

test('changed planning assertions invalidate existing final evidence', async t => {
  const f = fixture(t); const reports = await seedUpstream(f);
  f.write(f.base + 'tasks.md', '- [x] 1.1 Login\n');
  seedFinal(f, reports.common); assert.equal(ready(f.repo, 'demo').result, 'PASS');
  reports.plan.task_mapping[0].task_assertions = ['New acceptance assertion']; reports.save();
  assert.throws(() => ready(f.repo, 'demo'), /stale/i);
});
