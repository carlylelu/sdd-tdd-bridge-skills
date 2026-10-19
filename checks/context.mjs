import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { changeName, snapshot, readJSON, tasks, assertManagedPaths } from './lib.mjs';
import { assertReport } from './reports.mjs';

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
  const mapping = planning.task_mapping;
  if (!Array.isArray(mapping) || mapping.length !== taskList.length || new Set(mapping.map(m => m?.task_id)).size !== taskList.length || taskList.some(t => !mapping.some(m => m?.task_id === t.id))) throw Object.assign(new Error('PLANNING: task_mapping must cover exactly the current task IDs'), { stage: 'PLANNING' });
  return { context, planning, spec_fingerprint: current, task_list: taskList };
}
