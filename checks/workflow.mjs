import fs from 'node:fs';
import path from 'node:path';
import { activeChanges, changeName, snapshot, formatCheck } from './lib.mjs';
import { requireUpstreamReports } from './context.mjs';
import { ready } from './evidence.mjs';

const downstream = ['LOAD_CONTEXT', 'PLANNING', 'IMPLEMENT_TASK', 'DUAL_VERIFY', 'ARCHIVE'];
export function route(repo, { change, intent = 'auto' } = {}) {
  if (!['auto', 'explore', 'propose'].includes(intent)) throw new Error('intent must be auto, explore or propose');
  if (change) changeName(change);
  const candidates = activeChanges(snapshot(repo, false).files).sort();
  const decision = (stage, reason, extra = {}) => ({ result: 'PASS', decision_only: true, stage, change_id: change || null, reason, candidates, ...extra });
  // General exploration need not select an existing change or create one.
  if (intent === 'explore' && !change) return decision('EXPLORE', 'explicit_exploration');
  if (!change && candidates.length > 1) return decision('INTAKE', 'select_current_or_new_change', { result: 'NEEDS_CLARIFICATION' });
  change ||= candidates[0];
  if (intent !== 'auto') return decision(intent === 'explore' ? 'EXPLORE' : 'PROPOSAL', 'explicit_upstream_intent');
  if (!change || !fs.existsSync(path.join(repo, 'openspec/changes', change))) return decision('EXPLORE', 'no_prepared_change');
  try { formatCheck(repo, { change }); }
  catch (error) { return decision('PROPOSAL', 'artifacts_incomplete_or_invalid', { diagnostics: [error.message], invalidated_stages: downstream }); }
  let upstream;
  try { upstream = requireUpstreamReports(repo, change); }
  catch (error) {
    const stage = error.stage || 'LOAD_CONTEXT';
    return decision(stage, 'upstream_report_missing_invalid_or_stale', { diagnostics: [error.message], invalidated_stages: downstream.slice(downstream.indexOf(stage)) });
  }
  const pending = upstream.task_list.filter(task => !task.done).map(task => task.id);
  if (pending.length) return decision('IMPLEMENT_TASK', 'pending_tasks', { pending_tasks: pending, spec_fingerprint: upstream.spec_fingerprint });
  try { ready(repo, change); return decision('ARCHIVE', 'current_final_gate_passed'); }
  catch (error) { return decision('DUAL_VERIFY', 'final_verification_required', { diagnostics: [error.message] }); }
}
