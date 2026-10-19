import { specFingerprint } from '../checks/context.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bash = process.env.BASH_PATH || (process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash');
function fixture(t) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge test '));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  const git = (...args) => {
    const r = spawnSync('git', ['-c', `safe.directory=${repo.replaceAll('\\', '/')}`, '-C', repo, ...args], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  const write = (name, value) => {
    const p = path.join(repo, name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, value);
    if (typeof value === 'string' && value.startsWith('#!')) fs.chmodSync(p, 0o755);
  };
  git('init', '-q');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Bridge Test');
  // Avoid dependence on the current user's Git ignore configuration.
  git('config', 'core.excludesFile', path.join(repo, 'empty-ignore'));
  write('empty-ignore', '');
  const base = 'openspec/changes/demo';
  write(`${base}/proposal.md`, '## Scope\nImplement login.\n## Out-of-Scope\nBilling.\n');
  write(`${base}/design.md`, '## Design\nUse existing module.\n');
  write(`${base}/tasks.md`, '- [ ] 1.1 Implement login\n');
  write(`${base}/specs/auth/spec.md`, '## ADDED Requirements\n### Requirement: Login\n#### Scenario: Valid login\n- **Given** an account\n- **When** login is requested\n- **Then** return token\n');
  const check = (name, args = []) => spawnSync(bash, [path.join(source, 'checks', name), '--repo', repo, ...args], { encoding: 'utf8' });
  const cli = (...args) => spawnSync(process.execPath, [path.join(source, 'checks/bridge.mjs'), ...args, '--repo', repo], { encoding: 'utf8' });
  return { repo, git, write, base, check, cli };
}
const succeeds = r => assert.equal(r.status, 0, r.stdout + r.stderr);
const fails = r => assert.notEqual(r.status, 0, r.stdout + r.stderr);

test('accepts uppercase scenario keywords and legitimate generic syntax', t => {
  const f = fixture(t);
  f.write(`${f.base}/design.md`, '## Design\nUse List<User> and <div> markup.\n');
  f.write(`${f.base}/specs/auth/spec.md`, '### Requirement: Login\n#### Scenario: Login\n- **WHEN** login\n- **THEN** token\n');
  succeeds(f.check('openspec-format-check', ['--change', 'demo']));
});
test('checks the index rather than repaired unstaged contents', t => {
  const f = fixture(t);
  f.write(`${f.base}/design.md`, 'Invalid design\n');
  f.git('add', '.');
  f.write(`${f.base}/design.md`, '## Design\nFixed only in worktree\n');
  fails(f.check('openspec-format-check', ['--staged']));
});
test('ignores invalid unstaged contents when staged documents are valid', t => {
  const f = fixture(t); f.git('add', '.');
  f.write(`${f.base}/design.md`, 'invalid\n');
  succeeds(f.check('openspec-format-check', ['--staged']));
});
test('requires delta specs and excludes archived directories from discovery', t => {
  const f = fixture(t);
  fs.rmSync(path.join(f.repo, f.base, 'specs'), { recursive: true });
  fails(f.check('openspec-format-check', ['--change', 'demo']));
});
test('checks every scenario independently', t => {
  const f = fixture(t);
  f.write(`${f.base}/specs/auth/spec.md`, '### Requirement: Login\n#### Scenario: First\nGiven user\nWhen login\nThen token\n#### Scenario: Second\nWhen logout\n');
  fails(f.check('openspec-format-check', ['--change', 'demo']));
});
test('out-of-scope cannot satisfy scope and tasks must be checkboxes', t => {
  const f = fixture(t);
  f.write(`${f.base}/proposal.md`, '## Out-of-Scope\nNone\n');
  f.write(`${f.base}/tasks.md`, '- This is a note\n');
  fails(f.check('openspec-format-check', ['--change', 'demo']));
});
test('detects explicit placeholders in delta specs but allows prose mentioning TODO', t => {
  const f = fixture(t);
  f.write(`${f.base}/design.md`, '## Design\nThe TODO parser consumes TODO comments.\n');
  f.write(`${f.base}/specs/auth/spec.md`, '### Requirement: Login\n#### Scenario: Login\nGiven user\nWhen login\nThen token\nTODO: fill missing edge case\n');
  fails(f.check('openspec-format-check', ['--change', 'demo']));
});
test('missing requested change is an error even without openspec directory', t => {
  const f = fixture(t); fs.rmSync(path.join(f.repo, 'openspec'), { recursive: true });
  fails(f.check('openspec-format-check', ['--change', 'demo']));
});
test('rejects path traversal in change names', t => {
  const f = fixture(t);
  fails(f.check('openspec-format-check', ['--change', '../demo']));
});
test('allows staged archival and complete deletion of a change', t => {
  const f = fixture(t); f.git('add', '.'); f.git('commit', '-qm', 'initial');
  fs.mkdirSync(path.join(f.repo, 'openspec/changes/archive'), { recursive: true });
  fs.renameSync(path.join(f.repo, f.base), path.join(f.repo, 'openspec/changes/archive/2026-10-19-demo'));
  f.git('add', '-A');
  succeeds(f.check('openspec-format-check', ['--staged']));
});
test('requires Change-Id on implementation-only commits while changes are active', t => {
  const f = fixture(t); f.git('add', '.'); f.git('commit', '-qm', 'initial');
  f.write('src/login.js', 'export const login = () => true;'); f.git('add', '.');
  f.write('message', 'feat(auth): implement login\n');
  fails(f.check('commit-msg-check', ['--message-file', path.join(f.repo, 'message')]));
});
test('rejects mismatched association and non-trailer Change-Id', t => {
  const f = fixture(t); f.git('add', '.');
  f.write('message', 'feat(auth): login\n\nChange-Id: demo\n\nThis is body text.\n');
  fails(f.check('commit-msg-check', ['--message-file', path.join(f.repo, 'message')]));
});
test('accepts association to staged archive destination', t => {
  const f = fixture(t); f.git('add', '.'); f.git('commit', '-qm', 'initial');
  fs.mkdirSync(path.join(f.repo, 'openspec/changes/archive'), { recursive: true });
  fs.renameSync(path.join(f.repo, f.base), path.join(f.repo, 'openspec/changes/archive/2026-10-19-demo'));
  f.git('add', '-A'); f.write('message', 'chore(spec): archive\n\nChange-Id: demo\n');
  succeeds(f.check('commit-msg-check', ['--message-file', path.join(f.repo, 'message')]));
});
test('supports linked Git worktrees', t => {
  const f = fixture(t); f.git('add', '.'); f.git('commit', '-qm', 'initial');
  const linked = path.join(f.repo, 'linked'); f.git('worktree', 'add', '--detach', linked);
  succeeds(spawnSync(bash, [path.join(source, 'checks/openspec-format-check'), '--repo', linked, '--change', 'demo'], { encoding: 'utf8' }));
});
test('installation preserves existing hooks, doctor detects damage, uninstall restores config', t => {
  const f = fixture(t);
  f.write('custom-hooks/pre-commit', '#!/bin/sh\necho previous-hook\n');
  f.git('config', 'core.hooksPath', 'custom-hooks');
  succeeds(f.cli('install'));
  assert.equal(f.git('config', 'core.hooksPath'), '.bridge-hooks');
  succeeds(f.cli('doctor'));
  const hook = spawnSync(bash, [path.join(f.repo, '.bridge-hooks/pre-commit')], { cwd: f.repo, encoding: 'utf8' });
  succeeds(hook); assert.match(hook.stdout, /previous-hook/);
  fs.rmSync(path.join(f.repo, 'bridge/checks/bridge.mjs'));
  fails(f.cli('doctor'));
  fails(spawnSync(bash, [path.join(f.repo, '.bridge-hooks/pre-commit')], { cwd: f.repo, encoding: 'utf8' }));
  succeeds(f.cli('uninstall'));
  assert.equal(f.git('config', 'core.hooksPath'), 'custom-hooks');
  assert.ok(fs.existsSync(path.join(f.repo, 'custom-hooks/pre-commit')));
});
test('fingerprints exclude reports and invalidate on source changes', t => {
  const f = fixture(t);
  const before = f.cli('fingerprint'); succeeds(before);
  f.write('bridge/reports/demo/verify-report.json', '{}');
  assert.equal(f.cli('fingerprint').stdout, before.stdout);
  f.write('src/login.js', 'changed');
  assert.notEqual(f.cli('fingerprint').stdout, before.stdout);
});
test('ready requires per-task fresh evidence and actual command success', t => {
  const f = fixture(t);
  const snap = f.cli('fingerprint'); succeeds(snap);
  const fingerprint = JSON.parse(snap.stdout).fingerprint;
  const common = { schema_version: 1, change_id: 'demo', result: 'PASS', fingerprint, checked_at: new Date().toISOString(), evidence: ['reviewed auth'], issues: [], outputs: ['report.json'], next_action: 'ARCHIVE' };
  const upstream = { ...common, spec_fingerprint: specFingerprint(f.repo, 'demo').fingerprint };
  f.write('bridge/reports/demo/context-report.json', JSON.stringify({ ...upstream, stage: 'LOAD_CONTEXT' }));
  f.write('bridge/reports/demo/planning-report.json', JSON.stringify({ ...upstream, stage: 'PLANNING', task_mapping: [{ task_id: '1.1' }] }));
  f.write('bridge/reports/demo/tasks/1.1.json', JSON.stringify({ ...common, stage: 'IMPLEMENT_TASK', task_id: '1.1', scenario_ids: ['auth/Login/Valid login'], implementation_refs: ['src/login.js'], test_refs: ['test/login.js'], checks: { scenario_coverage: 'PASS', design_compliance: 'PASS', exclusion_scope: 'PASS', regression: 'PASS', code_review: 'PASS' } }));
  const report = { ...common, stage: 'DUAL_VERIFY', tasks: ['1.1'], checks: { full_scenario_coverage: 'PASS', effective_spec_compliance: 'PASS', code_review: 'PASS' }, openspec_verify: { result: 'PASS', evidence: ['review output'] }, verification: [{ command: 'node --test', exit_code: 0, evidence: ['1 test passed'] }] };
  f.write('bridge/reports/demo/verify-report.json', JSON.stringify(report));
  // A task checkbox must be complete before archive can be considered.
  fails(f.cli('ready', '--change', 'demo'));
  f.write(`${f.base}/tasks.md`, '- [x] 1.1 Implement login\n');
  const fingerprint2 = JSON.parse(f.cli('fingerprint').stdout).fingerprint;
  for (const file of ['bridge/reports/demo/tasks/1.1.json', 'bridge/reports/demo/verify-report.json']) {
    const r = JSON.parse(fs.readFileSync(path.join(f.repo, file))); r.fingerprint = fingerprint2; f.write(file, JSON.stringify(r));
  }
  succeeds(f.cli('ready', '--change', 'demo'));
  report.fingerprint = fingerprint2; report.verification[0].exit_code = 1;
  f.write('bridge/reports/demo/verify-report.json', JSON.stringify(report));
  fails(f.cli('ready', '--change', 'demo'));
  report.verification[0].exit_code = 0; f.write('bridge/reports/demo/verify-report.json', JSON.stringify(report));
  f.write('src/login.js', 'changed after verification');
  fails(f.cli('ready', '--change', 'demo'));
});

test('OpenCode registers skills and agent without overwriting user settings', async () => {
  const { SddTddBridgePlugin } = await import('../.opencode/plugins/sdd-tdd-bridge.js');
  const plugin = await SddTddBridgePlugin({});
  const config = {};
  await plugin.config(config);
  assert.equal(config.skills.paths.length, 1);
  assert.equal(config.agent.bridge_agent.mode, 'primary');
  assert.match(config.agent.bridge_agent.prompt, /有效规范/);
  const user = { agent: { bridge_agent: { prompt: 'user prompt', disable: true } } };
  await plugin.config(user);
  await plugin.config(user);
  assert.equal(user.skills.paths.length, 1);
  assert.equal(user.agent.bridge_agent.prompt, 'user prompt');
  assert.equal(user.agent.bridge_agent.disable, true);
});

test('reinstall works after uninstall without overwriting retained runtime files', t => {
  const f = fixture(t);
  succeeds(f.cli('install')); succeeds(f.cli('uninstall')); succeeds(f.cli('install'));
  succeeds(f.cli('doctor')); succeeds(f.cli('uninstall'));
});
test('previous hook edits are checked after it runs', t => {
  const f = fixture(t); f.git('add', '.');
  f.write('custom-hooks/pre-commit', '#!/bin/sh\nprintf "invalid\\n" > openspec/changes/demo/design.md\ngit add openspec/changes/demo/design.md\n');
  f.git('config', 'core.hooksPath', 'custom-hooks');
  succeeds(f.cli('install'));
  fails(spawnSync(bash, [path.join(f.repo, '.bridge-hooks/pre-commit')], { cwd: f.repo, encoding: 'utf8' }));
});
test('scope checks do not mistake excluded scope for included scope', t => {
  const f = fixture(t); f.write(`${f.base}/proposal.md`, '## Out-of-Scope\nNone\n');
  fails(f.check('openspec-format-check', ['--change', 'demo']));
});
test('prose about TODO is allowed and partial deletion is rejected', t => {
  const f = fixture(t); f.write(`${f.base}/design.md`, '## Design\nThe TODO parser consumes TODO comments.\n');
  succeeds(f.check('openspec-format-check', ['--change', 'demo']));
  f.git('add', '.'); f.git('commit', '-qm', 'initial');
  fs.unlinkSync(path.join(f.repo, f.base, 'design.md')); f.git('add', '-A');
  fails(f.check('openspec-format-check', ['--staged']));
});
test('mismatched staged change association is rejected', t => {
  const f = fixture(t); f.git('add', '.');
  f.write('message', 'feat(auth): login\n\nChange-Id: different\n');
  fails(f.check('commit-msg-check', ['--message-file', path.join(f.repo, 'message')]));
});
test('new staged change name after rename is checked', t => {
  const f = fixture(t); f.git('add', '.'); f.git('commit', '-qm', 'initial');
  fs.renameSync(path.join(f.repo, f.base), path.join(f.repo, 'openspec/changes/renamed'));
  f.git('add', '-A'); succeeds(f.check('openspec-format-check', ['--staged']));
});

test('installed hooks enforce association through real git commit', t => {
  const f = fixture(t);
  succeeds(f.cli('install')); f.git('add', 'openspec');
  const rejected = spawnSync('git', ['-c', `safe.directory=${f.repo.replaceAll('\\', '/')}`, '-C', f.repo, 'commit', '-m', 'feat(auth): implement login'], { encoding: 'utf8' });
  fails(rejected); assert.match(rejected.stdout + rejected.stderr, /Change-Id/);
  f.git('commit', '-qm', 'feat(auth): implement login', '-m', 'Change-Id: demo');
  assert.equal(f.git('rev-list', '--count', 'HEAD'), '1');
  succeeds(f.cli('uninstall'));
});

test('worktree installation uses isolated configuration and preserves sibling hooks', t => {
  const f = fixture(t); f.git('add', '.'); f.git('commit', '-qm', 'initial');
  f.git('config', 'extensions.worktreeConfig', 'true');
  f.git('config', '--local', 'core.hooksPath', 'custom-hooks');
  const linked = path.join(f.repo, 'linked'); f.git('worktree', 'add', '--detach', linked);
  const run = command => spawnSync(process.execPath, [path.join(source, 'checks/bridge.mjs'), command, '--repo', linked], { encoding: 'utf8' });
  succeeds(run('install'));
  assert.equal(f.git('config', '--get', 'core.hooksPath'), 'custom-hooks');
  succeeds(run('doctor')); succeeds(run('uninstall'));
  assert.equal(f.git('config', '--get', 'core.hooksPath'), 'custom-hooks');
});
test('multiple worktrees without isolated config are rejected before installation writes', t => {
  const f = fixture(t); f.git('add', '.'); f.git('commit', '-qm', 'initial');
  f.git('worktree', 'add', '--detach', path.join(f.repo, 'linked'));
  fails(f.cli('install'));
  assert.equal(fs.existsSync(path.join(f.repo, 'bridge/install-state.json')), false);
});
test('installation preserves hooks beyond pre-commit and commit-msg', t => {
  const f = fixture(t);
  f.write('custom-hooks/pre-push', '#!/bin/sh\necho previous-pre-push\nexit 42\n');
  f.git('config', 'core.hooksPath', 'custom-hooks'); succeeds(f.cli('install'));
  const result = spawnSync(bash, [path.join(f.repo, '.bridge-hooks/pre-push')], { cwd: f.repo, encoding: 'utf8' });
  assert.equal(result.status, 42, result.stderr); assert.match(result.stdout, /previous-pre-push/);
  succeeds(f.cli('uninstall'));
});
test('implementation commit cannot associate an unrelated historical archive', t => {
  const f = fixture(t);
  f.write('openspec/changes/archive/2026-01-01-old/proposal.md', 'old');
  f.git('add', '.'); f.git('commit', '-qm', 'initial');
  f.write('src/login.js', 'new code'); f.git('add', 'src');
  f.write('message', 'feat(auth): login\n\nChange-Id: old\n');
  fails(f.check('commit-msg-check', ['--message-file', path.join(f.repo, 'message')]));
});
test('configured user-home hook paths are expanded by Git', t => {
  const f = fixture(t);
  const home = path.join(f.repo, 'isolated-home');
  f.write('isolated-home/user-hooks/pre-commit', '#!/bin/sh\necho expanded-home-hook\n');
  f.git('config', 'core.hooksPath', '~/user-hooks');
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  const cli = command => spawnSync(process.execPath, [path.join(source, 'checks/bridge.mjs'), command, '--repo', f.repo], { encoding: 'utf8', env });
  succeeds(cli('install')); succeeds(cli('doctor'));
  const result = spawnSync(bash, [path.join(f.repo, '.bridge-hooks/pre-commit')], { cwd: f.repo, encoding: 'utf8', env });
  succeeds(result); assert.match(result.stdout, /expanded-home-hook/);
  succeeds(cli('uninstall'));
  assert.equal(f.git('config', 'core.hooksPath'), '~/user-hooks');
});
test('fingerprint hashes binary bytes rather than lossy text', t => {
  const f = fixture(t);
  f.write('data.bin', Buffer.from([255]));
  const first = f.cli('fingerprint'); succeeds(first);
  f.write('data.bin', Buffer.from([254]));
  const second = f.cli('fingerprint'); succeeds(second);
  assert.notEqual(first.stdout, second.stdout);
});
test('POSIX installation preserves disabled hook semantics', { skip: process.platform === 'win32' }, t => {
  const f = fixture(t);
  f.write('custom-hooks/pre-push', '#!/bin/sh\nexit 42\n');
  fs.chmodSync(path.join(f.repo, 'custom-hooks/pre-push'), 0o644);
  f.git('config', 'core.hooksPath', 'custom-hooks'); succeeds(f.cli('install'));
  assert.equal(fs.existsSync(path.join(f.repo, '.bridge-hooks/pre-push')), false);
  succeeds(f.cli('doctor')); succeeds(f.cli('uninstall'));
});
