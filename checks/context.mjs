import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { changeName, snapshot, readJSON, tasks, assertManagedPaths } from './lib.mjs';
import { assertReport, requireInvocation, stringList } from './reports.mjs';

export function specFingerprint(repo, change) {
  changeName(change);
  const base = `openspec/changes/${change}/`;
  const files = snapshot(repo, false).files.filter(file => file.startsWith(base) || file.startsWith('openspec/specs/') || /^openspec\/config\.(?:yaml|yml|json)$/i.test(file) || /(?:^|\/)(?:AGENTS|CLAUDE)\.md$/i.test(file)).sort();
  if (!files.some(file => file.startsWith(base))) throw new Error(`Missing OpenSpec change artifacts: ${change}`);
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    let bytes = fs.readFileSync(path.join(repo, file));
    let text = bytes.toString('utf8');
    // Preserve arbitrary bytes in attachments; normalize only losslessly decoded text.
    if (bytes.equals(Buffer.from(text, 'utf8'))) {
      text = text.replace(/\r\n?/g, '\n');
      if (file === base + 'tasks.md') text = text.replace(/^([ \t]*[-*][ \t]+\[)[ xX](\])/gm, '$1 $2');
      bytes = Buffer.from(text, 'utf8');
    }
    hash.update(JSON.stringify([file, crypto.createHash('sha256').update(bytes).digest('hex')]) + '\n');
  }
  return { algorithm: 'sha256', fingerprint: hash.digest('hex'), sources: files, normalization: 'line-endings-and-task-checkbox-progress' };
}
export function planFingerprint(repo, file) {
  if (typeof file !== 'string' || !file.trim() || file.includes('\\') || path.isAbsolute(file) || /^[A-Za-z]:/.test(file) || file.split('/').some(p => !p || p === '.' || p === '..') || !file.endsWith('.md') || file.startsWith('bridge/reports/') || file.startsWith('openspec/')) throw new Error('Plan must be a repository-relative Markdown implementation artifact, not a report or OpenSpec source');
  assertManagedPaths(repo, [file]);
  const full = path.join(repo, file);
  if (!fs.statSync(full).isFile()) throw new Error('Plan must be a regular file');
  const bytes = fs.readFileSync(full);
  if (!bytes.toString('utf8').trim()) throw new Error('Plan is empty');
  return { path: file, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}
function validatePlanning(repo, planning, taskList) {
  requireInvocation(planning, 'planning', ['writing-plans']);
  if (!planning.plan || !/^[a-f0-9]{64}$/.test(planning.plan.sha256)) throw new Error('Missing plan path/sha256');
  if (planFingerprint(repo, planning.plan.path).sha256 !== planning.plan.sha256) throw new Error('Implementation plan is stale; execute writing-plans again');
  const mapping = planning.task_mapping;
  if (!Array.isArray(mapping) || mapping.length !== taskList.length || new Set(mapping.map(m => m?.task_id)).size !== taskList.length || taskList.some(t => !mapping.some(m => m?.task_id === t.id))) throw new Error('task_mapping must cover exactly the current task IDs');
  for (const m of mapping) {
    if (!['behavior', 'non_behavior'].includes(m.kind) || !stringList(m.requirement_ids) || !stringList(m.task_assertions) || !stringList(m.implementation_files) || typeof m.plan_anchor !== 'string' || !m.plan_anchor.trim() || !stringList(m.scenario_ids, m.kind === 'behavior')) throw new Error(`Incomplete task_mapping for ${m.task_id}`);
    if (m.kind === 'non_behavior' && (typeof m.tdd_exemption !== 'string' || !m.tdd_exemption.trim())) throw new Error(`Non-behavior task ${m.task_id} needs a TDD exemption reason`);
    if (!Array.isArray(m.verification) || !m.verification.length || m.verification.some(v => typeof v?.command !== 'string' || !v.command.trim() || typeof v.test_ref !== 'string' || !v.test_ref.trim())) throw new Error(`Missing verification mapping for ${m.task_id}`);
    if (m.deferred_integration !== undefined && (!Array.isArray(m.deferred_integration) || m.deferred_integration.some(d => typeof d?.scenario_id !== 'string' || !d.scenario_id.trim() || !stringList(d.owner_tasks) || !d.owner_tasks.includes(m.task_id) || d.owner_tasks.some(id => !taskList.some(t => t.id === id)) || typeof d.final_verification !== 'string' || !d.final_verification.trim()))) throw new Error(`Invalid deferred integration for ${m.task_id}`);
  }
}
function readPhase(repo, change, stage, file, current) {
  try {
    const relative = `bridge/reports/${change}/${file}`;
    assertManagedPaths(repo, [relative]);
    const report = readJSON(path.join(repo, relative));
    assertReport(report, { stage, change_id: change });
    if (report.spec_fingerprint !== current) throw new Error('Upstream spec/source fingerprint is stale or missing');
    return report;
  } catch (error) {
    throw Object.assign(new Error(`${stage}: ${error.message}`), { stage });
  }
}
export function requireUpstreamReports(repo, change) {
  const current = specFingerprint(repo, change).fingerprint;
  const context = readPhase(repo, change, 'LOAD_CONTEXT', 'context-report.json', current);
  const planning = readPhase(repo, change, 'PLANNING', 'planning-report.json', current);
  const taskList = tasks(fs.readFileSync(path.join(repo, 'openspec/changes', change, 'tasks.md'), 'utf8'));
  try { validatePlanning(repo, planning, taskList); }
  catch (error) { throw Object.assign(new Error(`PLANNING: ${error.message}`), { stage: 'PLANNING' }); }
  return { context, planning, spec_fingerprint: current, task_list: taskList };
}
