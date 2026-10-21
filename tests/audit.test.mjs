import { invocations, mapping, planFile } from './helpers/flow.mjs';
import { specFingerprint } from '../checks/context.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { formatCheck, git, writeJSON, markdown } from '../checks/lib.mjs';
import { fingerprint, ready } from '../checks/evidence.mjs';
import { install, doctor, uninstall } from '../checks/install.mjs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

function fixture(t) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-audit-'));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  git(repo, 'init', '-q');
  git(repo, 'config', 'core.excludesFile', path.join(repo, 'empty-ignore'));
  function write(file, value) { fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true }); fs.writeFileSync(path.join(repo, file), value); }
  const base = 'openspec/changes/demo/';
  write(base + 'proposal.md', '## Scope\nLogin\n## Out-of-Scope\nBilling\n');
  write(base + 'design.md', '## Design\nExisting module\n');
  write(base + 'tasks.md', '- [x] 1.1 Login\n');
  write(base + 'specs/auth/spec.md', '## ADDED Requirements\n### Requirement: Login\n#### Scenario: Login\nWHEN requested\nTHEN token\n');
  return { repo, base, write };
}
function passingEvidence(f) {
  const common = { invocations: invocations(), schema_version: 1, change_id: 'demo', result: 'PASS', fingerprint: fingerprint(f.repo).fingerprint, checked_at: new Date().toISOString(), evidence: ['actual verification log'], issues: [], outputs: ['report.json'], next_action: 'ARCHIVE' };
  const upstream = { ...common, spec_fingerprint: specFingerprint(f.repo, 'demo').fingerprint };
  writeJSON(path.join(f.repo, 'bridge/reports/demo/context-report.json'), { ...upstream, stage: 'LOAD_CONTEXT' });
  writeJSON(path.join(f.repo, 'bridge/reports/demo/planning-report.json'), { ...upstream, stage: 'PLANNING', plan: planFile(f.repo), invocations: invocations(), task_mapping: mapping() });
  common.fingerprint = fingerprint(f.repo).fingerprint;
  const task = { ...common, stage: 'IMPLEMENT_TASK', task_id: '1.1', scenario_ids: ['auth/Login/Login'], implementation_refs: ['src/login.js'], test_refs: ['test/login.js'], checks: Object.fromEntries(['scenario_coverage', 'design_compliance', 'exclusion_scope', 'regression', 'code_review'].map(k => [k, 'PASS'])) };
  const final = { ...common, stage: 'DUAL_VERIFY', tasks: ['1.1'], checks: Object.fromEntries(['full_scenario_coverage', 'effective_spec_compliance', 'code_review'].map(k => [k, 'PASS'])), openspec_verify: { entry: 'openspec-verify-change', result: 'PASS', evidence: ['verified'] }, verification: [{ command: 'node --test', exit_code: 0, evidence: ['1 passed'] }] };
  return { task, final, save() { writeJSON(path.join(f.repo, 'bridge/reports/demo/tasks/1.1.json'), task); writeJSON(path.join(f.repo, 'bridge/reports/demo/verify-report.json'), final); } };
}

test('audit R1: each added requirement needs its own scenario', t => {
  const f = fixture(t);
  f.write(f.base + 'specs/auth/spec.md', '## ADDED Requirements\n### Requirement: Login\n#### Scenario: Login\nWHEN requested\nTHEN token\n### Requirement: Logout\nNo scenarios\n');
  assert.throws(() => formatCheck(f.repo, { change: 'demo' }), /scenario/i);
});
test('audit R1: empty WHEN and THEN are not verifiable scenarios', t => {
  const f = fixture(t);
  f.write(f.base + 'specs/auth/spec.md', '### Requirement: Login\n#### Scenario: Login\n- **WHEN**\n- **THEN**\n');
  assert.throws(() => formatCheck(f.repo, { change: 'demo' }), /scenario/i);
});
test('audit R1: rename-only delta is accepted with explicit FROM and TO', t => {
  const f = fixture(t);
  f.write(f.base + 'specs/auth/spec.md', '## RENAMED Requirements\n- FROM: `### Requirement: Old login`\n- TO: `### Requirement: Login`\n');
  assert.equal(formatCheck(f.repo, { change: 'demo' }).result, 'PASS');
});
test('audit R1: report with outstanding issues cannot pass ready', t => {
  const f = fixture(t); const reports = passingEvidence(f);
  reports.final.issues = [{ severity: 'P1', reason: 'login fails' }]; reports.save();
  assert.throws(() => ready(f.repo, 'demo'), /issues|unresolved/i);
});
test('audit R1: report timestamps must be real UTC strings, not coerced numbers', t => {
  const f = fixture(t); const reports = passingEvidence(f);
  reports.final.checked_at = 1; reports.save();
  assert.throws(() => ready(f.repo, 'demo'), /timestamp/i);
});
test('audit R1: content framing cannot collide across file boundaries', t => {
  const f = fixture(t);
  const delimiter = '\0"b.bin"\0file\0';
  f.write('a.bin', 'x' + delimiter + 'y'); f.write('b.bin', 'z');
  const first = fingerprint(f.repo).fingerprint;
  f.write('a.bin', 'x'); f.write('b.bin', 'y' + delimiter + 'z');
  assert.notEqual(fingerprint(f.repo).fingerprint, first);
});
test('audit R1: dangling symbolic link target changes invalidate evidence', t => {
  const f = fixture(t); const file = path.join(f.repo, 'dangling');
  try { fs.symlinkSync('missing-one', file); } catch (e) { if (e.code === 'EPERM') return t.skip('File symlinks require privileges on this Windows host'); throw e; }
  const first = fingerprint(f.repo).fingerprint;
  fs.unlinkSync(file); fs.symlinkSync('missing-two', file);
  assert.notEqual(fingerprint(f.repo).fingerprint, first);
});
test('audit R1: installation rejects managed junctions before writing outside repository', t => {
  const f = fixture(t); const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.writeFileSync(path.join(outside, 'sentinel'), 'keep');
  fs.symlinkSync(outside, path.join(f.repo, 'bridge'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => install(f.repo), /symlink|junction|managed|contain/i);
  assert.deepEqual(fs.readdirSync(outside), ['sentinel']);
});
test('audit R1: doctor rejects truncated runtime and installed hook fails closed', t => {
  const f = fixture(t); install(f.repo);
  fs.writeFileSync(path.join(f.repo, 'bridge/checks/bridge.mjs'), '');
  assert.throws(() => doctor(f.repo), /integrity|hash|runtime/i);
  const bash = process.env.BASH_PATH || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
  const result = spawnSync(bash, [path.join(f.repo, '.bridge-hooks/pre-commit')], { cwd: f.repo, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  uninstall(f.repo);
});
test('audit R1: Claude manifest repository uses the host string schema', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8'));
  assert.equal(typeof manifest.repository, 'string');
});

test('audit R2: packaged artifact installs, validates and registers its agent', { skip: !process.env.BRIDGE_PACKAGE_TGZ }, async t => {
  const f = fixture(t); const extracted = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-packed-'));
  t.after(() => fs.rmSync(extracted, { recursive: true, force: true }));
  const unpack = spawnSync('tar', ['-xzf', process.env.BRIDGE_PACKAGE_TGZ, '-C', extracted], { encoding: 'utf8' });
  assert.equal(unpack.status, 0, unpack.stderr);
  const root = path.join(extracted, 'package');
  const run = (entry, ...args) => {
    const result = spawnSync(process.execPath, [entry, ...args, '--repo', f.repo], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr); return result;
  };
  const cli = path.join(root, 'checks/bridge.mjs');
  run(cli, 'format', '--change', 'demo'); run(cli, 'install');
  run(path.join(f.repo, 'bridge/checks/bridge.mjs'), 'doctor');
  run(path.join(f.repo, 'bridge/checks/bridge.mjs'), 'route', '--change', 'demo');
  run(path.join(f.repo, 'bridge/checks/bridge.mjs'), 'spec-fingerprint', '--change', 'demo');
  for (const name of ['explore', 'proposal']) assert.ok(fs.existsSync(path.join(root, `skills/bridge-${name}-skill/SKILL.md`)));
  run(path.join(f.repo, 'bridge/checks/bridge.mjs'), 'plan-fingerprint', '--plan', planFile(f.repo).path);
  run(cli, 'uninstall');
  const { SddTddBridgePlugin } = await import(pathToFileURL(path.join(root, '.opencode/plugins/sdd-tdd-bridge.js')));
  const config = {}; await (await SddTddBridgePlugin({})).config(config);
  assert.ok(fs.existsSync(path.join(config.skills.paths[0], 'bridge-load-context-skill/references/workflow.md')));
  assert.match(config.agent.bridge_agent.prompt, /有效规范/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'templates/task-report.json'))).result, 'BLOCKED');
});
test('audit R2: WHEN cannot consume a THEN line as its value', t => {
  const f = fixture(t); f.write(f.base + 'specs/auth/spec.md', '### Requirement: Login\n#### Scenario: Login\nWHEN\nTHEN token\n');
  assert.throws(() => formatCheck(f.repo, { change: 'demo' }), /scenario/i);
});
test('audit R2: orphan scenarios are rejected even before a valid requirement', t => {
  const f = fixture(t); f.write(f.base + 'specs/auth/spec.md', '#### Scenario: Orphan\nWHEN\n### Requirement: Login\n#### Scenario: Login\nWHEN request\nTHEN token\n');
  assert.throws(() => formatCheck(f.repo, { change: 'demo' }), /parent|orphan/i);
});
test('audit R2: empty declared delta operations cannot hide behind valid removals', t => {
  const f = fixture(t); f.write(f.base + 'specs/auth/spec.md', '## REMOVED Requirements\n### Requirement: Old login\n## ADDED Requirements\n');
  assert.throws(() => formatCheck(f.repo, { change: 'demo' }), /empty|entries|requirement/i);
});
test('audit R2: a sibling heading ends a requirement before an unrelated scenario', t => {
  const f = fixture(t); f.write(f.base + 'specs/auth/spec.md', '### Requirement: Login\n### Notes\n#### Scenario: Not a requirement scenario\nWHEN request\nTHEN token\n');
  assert.throws(() => formatCheck(f.repo, { change: 'demo' }), /scenario/i);
});
test('audit R2: task report arrays and report common fields are required', t => {
  const f = fixture(t); const reports = passingEvidence(f); delete reports.task.implementation_refs; reports.save();
  assert.throws(() => ready(f.repo, 'demo'), /implementation_refs/i);
});
test('audit R2: uninstall rejects a replacement managed directory link without deleting target', t => {
  const f = fixture(t); install(f.repo);
  const external = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-uninstall-outside-'));
  t.after(() => fs.rmSync(external, { recursive: true, force: true }));
  const hooks = path.join(f.repo, '.bridge-hooks');
  fs.renameSync(hooks, path.join(f.repo, 'saved-hooks'));
  fs.writeFileSync(path.join(external, 'pre-commit'), 'keep');
  fs.symlinkSync(external, hooks, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => uninstall(f.repo), /symlink|junction/i);
  assert.equal(fs.readFileSync(path.join(external, 'pre-commit'), 'utf8'), 'keep');
  assert.equal(git(f.repo, 'config', '--get', 'core.hooksPath').trim(), '.bridge-hooks');
});
test('audit R2: malformed installation state cannot corrupt restored hooksPath', t => {
  const f = fixture(t); install(f.repo);
  const stateFile = path.join(f.repo, 'bridge/install-state.json');
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); delete state.previousLocal; writeJSON(stateFile, state);
  assert.throws(() => uninstall(f.repo), /state|schema|previousLocal/i);
  assert.equal(git(f.repo, 'config', '--get', 'core.hooksPath').trim(), '.bridge-hooks');
  assert.ok(fs.existsSync(stateFile));
});
test('audit R3: invalid closing fences cannot expose code examples as scenarios', t => {
  const f = fixture(t); f.write(f.base + 'specs/auth/spec.md', '### Requirement: Login\n```text\n```not-a-close\n#### Scenario: Example only\nWHEN request\nTHEN token\n```\n');
  assert.throws(() => formatCheck(f.repo, { change: 'demo' }), /scenario/i);
});
test('audit R3: a backtick in an info string prevents opening a backtick fence', () => {
  assert.ok(markdown('```invalid`info\n# Real heading').includes('# Real heading'));
});
test('audit R3: four-space indented markers do not open fenced blocks', () => {
  assert.ok(markdown('    ```\n# Real heading').includes('# Real heading'));
});
