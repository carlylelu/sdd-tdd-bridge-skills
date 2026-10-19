import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { git, readJSON, writeJSON, assertManagedPaths } from './lib.mjs';

const source = path.dirname(fileURLToPath(import.meta.url));
const marker = '# sdd-tdd-bridge managed hook v1';
const runtimeFiles = ['bridge.mjs', 'lib.mjs', 'install.mjs', 'evidence.mjs', 'openspec-format-check', 'commit-msg-check'];
function managedPaths(repo) {
  assertManagedPaths(repo, ['bridge', 'bridge/checks', 'bridge/install-state.json', '.bridge-hooks', ...runtimeFiles.map(name => `bridge/checks/${name}`)]);
}
function runtimeHashes(repo) {
  return Object.fromEntries(runtimeFiles.map(name => [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, 'bridge/checks', name))).digest('hex')]));
}
function readState(repo) {
  const state = readJSON(path.join(repo, 'bridge/install-state.json'));
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!record(state) || state.owner !== 'sdd-tdd-bridge' || state.schema_version !== 1 || !['--local', '--worktree'].includes(state.configScope)
    || !(state.previousLocal === null || typeof state.previousLocal === 'string') || !record(state.previousHooks)
    || !Object.hasOwn(state.previousHooks, 'pre-commit') || !Object.hasOwn(state.previousHooks, 'commit-msg')
    || Object.entries(state.previousHooks).some(([name, previous]) => !/^[a-z][a-z0-9-]*$/.test(name) || !(previous === null || typeof previous === 'string' && path.isAbsolute(previous)))
    || !record(state.runtime_hashes) || runtimeFiles.some(name => typeof state.runtime_hashes[name] !== 'string' || !/^[a-f0-9]{64}$/.test(state.runtime_hashes[name]))
    || !Array.isArray(state.copied) || state.copied.some(file => !runtimeFiles.some(name => file === `bridge/checks/${name}`))) throw new Error('Invalid installation state schema; refusing configuration changes');
  return state;
}
// Independent of the installed modules: an empty/broken CLI must not silently pass a hook.
const integrityProgram = `const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo=fs.realpathSync(process.argv[1]);
const state=JSON.parse(fs.readFileSync(path.join(repo,'bridge/install-state.json'),'utf8'));
for(const name of ${JSON.stringify(runtimeFiles)}){
 const file=path.join(repo,'bridge/checks',name);
 for(const target of [path.join(repo,'bridge'),path.join(repo,'bridge/checks'),file,path.join(repo,'bridge/install-state.json')]) if(fs.lstatSync(target).isSymbolicLink()) throw Error('Managed runtime symlink/junction');
 if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==state.runtime_hashes?.[name]) throw Error('Bridge runtime integrity failed: '+name);
}`;
function configScope(repo) {
  const r = spawnSync('git', ['-c', `safe.directory=${repo.replaceAll('\\', '/')}`, '-C', repo, 'config', '--bool', '--get', 'extensions.worktreeConfig'], { encoding: 'utf8' });
  if (r.status !== 0 && r.status !== 1) throw new Error(r.stderr || 'Cannot read worktree configuration');
  return r.stdout.trim() === 'true' ? '--worktree' : '--local';
}
function checkWorktreeScope(repo, scope) {
  const count = git(repo, 'worktree', 'list', '--porcelain', '-z').split('\0').filter(s => s.startsWith('worktree ')).length;
  if (scope === '--local' && count > 1) throw new Error('Multiple worktrees need extensions.worktreeConfig=true before installation; shared hooksPath would affect sibling worktrees');
}
function hooksConfig(repo, scope = configScope(repo)) {
  const r = spawnSync('git', ['-c', `safe.directory=${repo.replaceAll('\\', '/')}`, '-C', repo, 'config', scope, '--get', 'core.hooksPath'], { encoding: 'utf8' });
  if (r.status === 1) return null;
  if (r.status !== 0) throw new Error(r.stderr || 'Cannot read hooksPath');
  return r.stdout.trim();
}
function quote(value) { return "'" + value.replaceAll("'", "'\\''") + "'"; }
function activeHook(file) {
  return fs.existsSync(file) && fs.statSync(file).isFile() && (process.platform === 'win32' || (fs.statSync(file).mode & 0o111) !== 0);
}
function hookText(name, previous) {
  const command = name === 'pre-commit' ? 'format --staged' : name === 'commit-msg' ? 'commit --message-file "$1"' : null;
  const invokePrevious = previous && (process.platform === 'win32'
    ? `if [ -x ${quote(previous)} ]; then ${quote(previous)} "$@"; else sh ${quote(previous)} "$@"; fi\n`
    : `if [ -x ${quote(previous)} ]; then ${quote(previous)} "$@"; fi\n`);
  // Existing hooks may mutate the index/message; Bridge must check the final input.
  return `#!/usr/bin/env sh\n${marker}\nset -eu\n${command ? 'repo=$(git rev-parse --show-toplevel)\n' : ''}${previous ? `if [ ! -f ${quote(previous)} ]; then echo 'Previous hook missing' >&2; exit 1; fi\n${invokePrevious}` : ''}${command ? `node -e ${quote(integrityProgram)} "$repo"\nnode "$repo/bridge/checks/bridge.mjs" ${command} --repo "$repo"\n` : ''}`;
}
export function install(repo) {
  managedPaths(repo);
  const scope = configScope(repo);
  checkWorktreeScope(repo, scope);
  const stateFile = path.join(repo, 'bridge/install-state.json');
  if (fs.existsSync(stateFile)) {
    const state = readState(repo);
    if (state.owner !== 'sdd-tdd-bridge' || hooksConfig(repo) !== '.bridge-hooks') throw new Error('Existing installation changed; inspect it before reinstalling');
    doctor(repo);
    return { result: 'PASS', message: 'Already installed' };
  }
  const previousLocal = hooksConfig(repo, scope);
  const effective = spawnSync('git', ['-c', `safe.directory=${repo.replaceAll('\\', '/')}`, '-C', repo, 'config', '--path', '--get', 'core.hooksPath'], { encoding: 'utf8' });
  if (effective.status !== 0 && effective.status !== 1) throw new Error(effective.stderr);
  const oldDir = effective.status === 0 ? path.resolve(repo, effective.stdout.trim()) : path.resolve(repo, git(repo, 'rev-parse', '--git-path', 'hooks').trim());
  const owned = path.join(repo, '.bridge-hooks');
  if (fs.existsSync(owned)) throw new Error('.bridge-hooks already exists without ownership record');
  const destination = path.join(repo, 'bridge/checks');
  for (const name of runtimeFiles) {
    const target = path.join(destination, name);
    if (fs.existsSync(target) && !fs.readFileSync(target).equals(fs.readFileSync(path.join(source, name)))) throw new Error(`Refusing to overwrite ${target}`);
  }
  fs.mkdirSync(destination, { recursive: true }); fs.mkdirSync(owned);
  const copied = [];
  const createdHooks = [];
  try {
    for (const name of runtimeFiles) {
      const target = path.join(destination, name);
      if (!fs.existsSync(target)) { fs.copyFileSync(path.join(source, name), target); copied.push(`bridge/checks/${name}`); }
      fs.chmodSync(target, 0o755);
    }
    const previousHooks = {};
    const names = new Set(['pre-commit', 'commit-msg']);
    if (fs.existsSync(oldDir)) for (const entry of fs.readdirSync(oldDir, { withFileTypes: true })) {
      if ((entry.isFile() || entry.isSymbolicLink()) && /^[a-z][a-z0-9-]*$/.test(entry.name) && activeHook(path.join(oldDir, entry.name))) names.add(entry.name);
    }
    for (const name of names) {
      const old = path.join(oldDir, name);
      const previous = activeHook(old) ? old.replaceAll('\\', '/') : null;
      if (previous && fs.readFileSync(old, 'utf8').includes(marker)) throw new Error('Refusing recursive managed hook chain');
      previousHooks[name] = previous;
      fs.writeFileSync(path.join(owned, name), hookText(name, previous), { mode: 0o755 });
      createdHooks.push(name);
    }
    writeJSON(stateFile, { owner: 'sdd-tdd-bridge', schema_version: 1, configScope: scope, previousLocal, previousHooks, copied, runtime_hashes: runtimeHashes(repo) });
    git(repo, 'config', scope, 'core.hooksPath', '.bridge-hooks');
  } catch (error) {
    for (const file of copied) fs.unlinkSync(path.join(repo, file));
    for (const name of createdHooks) fs.unlinkSync(path.join(owned, name));
    fs.rmdirSync(owned);
    if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
    throw error;
  }
  return { result: 'PASS', message: 'Installed repository-local checks and chained hooks; install host skills/agent separately' };
}
export function doctor(repo) {
  managedPaths(repo);
  const state = readState(repo);
  checkWorktreeScope(repo, configScope(repo));
  if (state.owner !== 'sdd-tdd-bridge' || state.configScope !== configScope(repo) || hooksConfig(repo) !== '.bridge-hooks') throw new Error('Bridge hooks are not enabled or configuration scope changed');
  for (const name of runtimeFiles) {
    const file = path.join(repo, 'bridge/checks', name);
    if (!fs.existsSync(file)) throw new Error(`Missing checker: ${file}`);
    if (process.platform !== 'win32') fs.accessSync(file, fs.constants.X_OK);
  }
  const actual = runtimeHashes(repo);
  if (runtimeFiles.some(name => actual[name] !== state.runtime_hashes?.[name])) throw new Error('Installed runtime integrity/hash mismatch');
  for (const name of Object.keys(state.previousHooks)) {
    assertManagedPaths(repo, [`.bridge-hooks/${name}`]);
    const file = path.join(repo, '.bridge-hooks', name);
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== hookText(name, state.previousHooks[name])) throw new Error(`Missing/modified hook: ${name}`);
    if (process.platform !== 'win32') fs.accessSync(file, fs.constants.X_OK);
    if (state.previousHooks[name] && !fs.existsSync(state.previousHooks[name])) throw new Error(`Previous hook disappeared: ${name}`);
  }
  return { result: 'PASS', node: process.version, git: git(repo, '--version').trim(), hooks: 'ENABLED', config_scope: state.configScope, host_skills: 'NOT_CHECKED', host_agent: 'NOT_CHECKED', openspec: 'NOT_CHECKED', superpowers: 'NOT_CHECKED' };
}
export function uninstall(repo) {
  managedPaths(repo);
  const file = path.join(repo, 'bridge/install-state.json');
  const state = readState(repo);
  if (state.owner !== 'sdd-tdd-bridge') throw new Error('Invalid installation ownership');
  assertManagedPaths(repo, Object.keys(state.previousHooks).map(name => `.bridge-hooks/${name}`));
  if (state.configScope !== configScope(repo) || hooksConfig(repo) !== '.bridge-hooks') throw new Error('hooksPath/scope changed after installation; refusing to overwrite it');
  if (state.previousLocal === null) git(repo, 'config', state.configScope, '--unset', 'core.hooksPath');
  else git(repo, 'config', state.configScope, 'core.hooksPath', state.previousLocal);
  fs.unlinkSync(file);
  for (const name of Object.keys(state.previousHooks)) {
    const hook = path.join(repo, '.bridge-hooks', name);
    if (fs.existsSync(hook) && fs.readFileSync(hook, 'utf8') === hookText(name, state.previousHooks[name])) fs.unlinkSync(hook);
  }
  const dir = path.join(repo, '.bridge-hooks');
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  return { result: 'PASS', message: 'Previous hooksPath restored; checkers and reports retained' };
}
