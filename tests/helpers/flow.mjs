import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const receipt = skill => ({ skill, status: 'PASS', evidence: ['fixture simulated host execution log'] });
export const invocations = () => ({ planning: receipt('superpowers:writing-plans'), implementation: receipt('superpowers:executing-plans'), tdd: receipt('superpowers:test-driven-development'), code_review: receipt('superpowers:requesting-code-review'), verification: receipt('superpowers:verification-before-completion') });
export const mapping = () => [{ task_id: '1.1', kind: 'behavior', requirement_ids: ['auth/Login'], scenario_ids: ['auth/Login/Login'], task_assertions: ['Login returns a token'], implementation_files: ['src/login.js'], plan_anchor: 'Task 1', verification: [{ command: 'node --test', test_ref: 'tests/login.js' }] }];
export function planFile(repo) {
  const relative = 'docs/superpowers/plans/demo.md';
  const full = path.join(repo, relative); fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, '# Demo Implementation Plan\n\n## Task 1 — OpenSpec 1.1\nImplement and test login.\n');
  return { path: relative, sha256: crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex') };
}
