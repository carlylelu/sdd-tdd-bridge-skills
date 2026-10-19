import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { changeName, git, readJSON, tasks } from './lib.mjs';
import { assertReport } from './reports.mjs';
import { requireUpstreamReports } from './context.mjs';

export function fingerprint(repo) {
  const files = [...new Set(git(repo, 'ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean))]
    .filter(f => (!f.startsWith('bridge/reports/') || /^bridge\/reports\/[^/]+\/(?:context|planning)-report\.json$/.test(f)) && !f.startsWith('.bridge-hooks/') && f !== 'bridge/install-state.json').sort();
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    const full = path.join(repo, file);
    let stat;
    try { stat = fs.lstatSync(full); }
    catch (error) { if (error.code !== 'ENOENT') throw error; hash.update(JSON.stringify([file, 'deleted']) + '\n'); continue; }
    if (stat.isSymbolicLink()) { hash.update(JSON.stringify([file, 'link', fs.readlinkSync(full)]) + '\n'); continue; }
    if (!stat.isFile()) throw new Error(`Cannot fingerprint directory/submodule ${file}; verify it separately`);
    const digest = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
    hash.update(JSON.stringify([file, stat.mode & 0o111 ? 'executable' : 'file', digest]) + '\n');
  }
  return { algorithm: 'sha256', fingerprint: hash.digest('hex'), file_count: files.length };
}
function nonemptyEvidence(value) { return Array.isArray(value) && value.length > 0 && value.every(s => typeof s === 'string' && s.trim()); }
function passingReport(report, expected, current) {
  assertReport(report, expected);
  if (report.fingerprint !== current) throw new Error('Report is stale; recheck changed inputs');
}
function requireChecks(report, names) {
  for (const name of names) if (report.checks?.[name] !== 'PASS') throw new Error(`Missing passing check: ${name}`);
}
export function ready(repo, change) {
  changeName(change);
  requireUpstreamReports(repo, change);
  const base = path.join(repo, 'bridge/reports', change);
  const taskList = tasks(fs.readFileSync(path.join(repo, 'openspec/changes', change, 'tasks.md'), 'utf8'));
  if (taskList.some(t => !t.done)) throw new Error('All tasks must be completed before archive');
  const current = fingerprint(repo).fingerprint;
  for (const task of taskList) {
    const report = readJSON(path.join(base, 'tasks', `${task.id}.json`));
    passingReport(report, { stage: 'IMPLEMENT_TASK', change_id: change, task_id: task.id }, current);
    for (const field of ['scenario_ids', 'implementation_refs', 'test_refs']) if (!Array.isArray(report[field]) || report[field].some(value => typeof value !== 'string' || !value.trim())) throw new Error(`Task report ${field} must be a string array`);
    requireChecks(report, ['scenario_coverage', 'design_compliance', 'exclusion_scope', 'regression', 'code_review']);
  }
  const report = readJSON(path.join(base, 'verify-report.json'));
  passingReport(report, { stage: 'DUAL_VERIFY', change_id: change }, current);
  if (!Array.isArray(report.tasks) || report.tasks.length !== taskList.length || new Set(report.tasks).size !== taskList.length || taskList.some(t => !report.tasks.includes(t.id))) throw new Error('Final report must cover exactly all tasks');
  requireChecks(report, ['full_scenario_coverage', 'effective_spec_compliance', 'code_review']);
  if (report.openspec_verify?.result !== 'PASS' || !nonemptyEvidence(report.openspec_verify.evidence)) throw new Error('OpenSpec verification missing or failed');
  if (!Array.isArray(report.verification) || !report.verification.length || report.verification.some(v => typeof v.command !== 'string' || !v.command.trim() || v.exit_code !== 0 || !nonemptyEvidence(v.evidence))) throw new Error('Verification commands must have exit_code 0 and evidence');
  return { result: 'PASS', change_id: change, fingerprint: current, task_count: taskList.length, next_action: 'Archive using the host OpenSpec integration' };
}
