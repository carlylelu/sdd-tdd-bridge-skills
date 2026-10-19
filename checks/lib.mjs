import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function git(repo, ...args) {
  const r = spawnSync('git', ['-c', `safe.directory=${repo.replaceAll('\\', '/')}`, '-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error || r.status !== 0) throw new Error(r.error?.message || r.stderr.trim() || `git ${args[0]} failed`);
  return r.stdout;
}
export function repository(value) {
  const repo = fs.realpathSync(value);
  const top = fs.realpathSync(git(repo, 'rev-parse', '--show-toplevel').trim());
  if (repo !== top) throw new Error('--repo must be the repository root');
  return repo;
}
export function changeName(value) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value === 'archive') throw new Error(`Invalid change name: ${value}`);
  return value;
}
export function readJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
export function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
export function assertManagedPaths(repo, files) {
  for (const file of files) {
    const relative = path.relative(repo, path.resolve(repo, file));
    if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative)) throw new Error(`Managed path escapes repository: ${file}`);
    let current = repo;
    for (const part of relative.split(path.sep)) {
      current = path.join(current, part);
      try { if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Managed path is a symlink/junction: ${current}`); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
}
export function snapshot(repo, staged) {
  if (staged) {
    const entries = git(repo, 'ls-files', '--stage', '-z').split('\0').filter(Boolean);
    const files = entries.map(entry => {
      const match = entry.match(/^\d+ [a-f0-9]+ (\d)\t([\s\S]*)$/);
      if (!match || match[1] !== '0') throw new Error('Unmerged Git index; resolve conflicts first');
      return match[2];
    });
    return { files, read: file => git(repo, 'show', `:${file}`) };
  }
  const files = git(repo, 'ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean);
  return { files: [...new Set(files)].filter(file => fs.existsSync(path.join(repo, file)) && !fs.statSync(path.join(repo, file)).isDirectory()), read: file => fs.readFileSync(path.join(repo, file), 'utf8') };
}
export function changedFiles(repo) {
  return git(repo, 'diff', '--cached', '--name-only', '--no-renames', '-z', '--diff-filter=ACMRD').split('\0').filter(Boolean);
}
export function activeChanges(files) {
  return [...new Set(files.map(f => f.match(/^openspec\/changes\/([^/]+)\//)?.[1]).filter(n => n && n !== 'archive'))];
}
export function markdown(text) {
  let fence = null;
  return text.replace(/\r/g, '').split('\n').map(line => {
    const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (match) {
      if (!fence && !(match[1][0] === '`' && match[2].includes('`'))) { fence = match[1]; return ''; }
      if (fence && match[1][0] === fence[0] && match[1].length >= fence.length && /^[ \t]*$/.test(match[2])) { fence = null; return ''; }
    }
    return fence ? '' : line;
  });
}
export function tasks(text) {
  const result = [];
  for (const line of markdown(text)) {
    const match = line.match(/^\s*[-*]\s+\[([ xX])\]\s+([A-Za-z0-9][A-Za-z0-9._-]*)\s+\S/);
    if (match) result.push({ id: match[2], done: match[1].toLowerCase() === 'x' });
    else if (/^\s*[-*]\s+\[[ xX]\]/.test(line)) throw new Error('Every task needs a stable ID, e.g. - [ ] 1.1 Implement login');
  }
  if (!result.length || new Set(result.map(t => t.id)).size !== result.length) throw new Error('Task list is empty or has duplicate IDs');
  return result;
}
function checkDelta(lines, issue) {
  const sections = [{ operation: 'ADDED', lines: [], explicit: false }];
  for (const line of lines) {
    const operation = line.match(/^##\s+(ADDED|MODIFIED|REMOVED|RENAMED) Requirements\s*$/i);
    if (operation) sections.push({ operation: operation[1].toUpperCase(), lines: [], explicit: true });
    else sections.at(-1).lines.push(line);
  }
  let entries = 0;
  for (const section of sections) {
    if (!section.lines.some(line => line.trim())) {
      if (section.explicit) issue(`Empty ${section.operation} Requirements section`);
      continue;
    }
    if (section.operation === 'RENAMED') {
      const pairs = section.lines.filter(line => /^\s*[-*]\s+(FROM|TO)\s*:/i.test(line));
      if (!pairs.length || pairs.length % 2 || pairs.some((line, i) => !new RegExp(`^\\s*[-*]\\s+${i % 2 ? 'TO' : 'FROM'}\\s*:\\s*\\S`, 'i').test(line) || !line.replace(/^.*?:/, '').replace(/`|###\s*Requirement\s*:/gi, '').trim())) issue('RENAMED requires nonempty ordered FROM/TO pairs');
      else entries += pairs.length / 2;
      continue;
    }
    const starts = section.lines.map((line, i) => /^###\s+(?:Requirement|需求)\s*[:：]\s*\S/i.test(line) ? i : -1).filter(i => i >= 0);
    if (!starts.length && section.explicit) issue(`${section.operation} section has no Requirement entries`);
    entries += starts.length;
    const assignedScenarios = new Set();
    for (let r = 0; r < starts.length; r++) {
      let requirementEnd = starts[r] + 1;
      while (requirementEnd < section.lines.length && !/^#{1,3}\s/.test(section.lines[requirementEnd])) requirementEnd++;
      const requirement = section.lines.slice(starts[r] + 1, requirementEnd);
      const scenarios = requirement.map((line, i) => /^####\s+(?:Scenario|场景)\s*[:：]/i.test(line) ? i : -1).filter(i => i >= 0);
      if (!scenarios.length && section.operation !== 'REMOVED') issue(`${section.lines[starts[r]]}: Missing scenario`);
      const names = new Set();
      for (const start of scenarios) {
        assignedScenarios.add(starts[r] + 1 + start);
        const name = requirement[start].replace(/^####\s+(?:Scenario|场景)\s*[:：]/i, '').trim();
        if (!name || names.has(name)) issue('Empty or duplicate scenario name');
        names.add(name);
        let end = start + 1;
        while (end < requirement.length && !/^#{1,4}\s/.test(requirement[end])) end++;
        const block = requirement.slice(start + 1, end).map(line => line.trim().replace(/^[-*]\s+/, '').replace(/^\*\*/, ''));
        for (const token of ['WHEN|当', 'THEN|则']) if (!block.some(line => new RegExp(`^(?:${token})(?:\\*\\*)?(?:[ \\t]|[:：])+\\S`, 'i').test(line))) issue(`Scenario ${name}: Missing nonempty ${token}`);
      }
    }
    section.lines.forEach((line, i) => { if (/^####\s+(?:Scenario|场景)\s*[:：]/i.test(line) && !assignedScenarios.has(i)) issue('Orphan scenario has no parent requirement'); });
  }
  if (!entries) issue('Missing Requirement or valid RENAMED mapping');
}
export function formatCheck(repo, { change, staged = false } = {}) {
  if (change) changeName(change);
  const view = snapshot(repo, staged);
  const active = activeChanges(view.files);
  const requested = staged ? activeChanges(changedFiles(repo)) : change ? [change] : active;
  const issues = [];
  for (const name of requested) {
    changeName(name);
    const base = `openspec/changes/${name}/`;
    const files = view.files.filter(f => f.startsWith(base));
    // Complete removal/archival is allowed; partial removal is still checked.
    if (!files.length && staged) continue;
    const issue = text => issues.push(`${name}: ${text}`);
    for (const required of ['proposal.md', 'design.md', 'tasks.md']) if (!files.includes(base + required)) issue(`Missing ${required}`);
    const text = file => files.includes(base + file) ? view.read(base + file) : '';
    const headings = file => markdown(text(file)).filter(l => /^#{1,6}\s/.test(l)).map(l => l.replace(/^#+\s+/, '').trim());
    const proposal = headings('proposal.md');
    if (!proposal.some(h => /^(?:范围|变更范围|变更内容|Scope|In[- ]Scope|What Changes)\s*[:：]?$/i.test(h))) issue('Missing Scope / What Changes heading');
    if (!proposal.some(h => /^(?:排除范围|不在范围内|Out[- ]of[- ]Scope|Exclusions?|Non[- ]Goals)\s*[:：]?$/i.test(h))) issue('Missing Out-of-Scope heading');
    if (!headings('design.md').some(h => /^(?:技术方案|方案|设计|架构|架构决策|决策|Design|Architecture|Decisions)(?:\s|$|[:：])/i.test(h))) issue('Missing Design / Decisions heading');
    try { tasks(text('tasks.md')); } catch (e) { issue(e.message); }
    const specs = files.filter(f => f.startsWith(base + 'specs/') && f.endsWith('.md'));
    if (!specs.length) issue('Missing specs/*.md delta specification');
    for (const file of specs) {
      const lines = markdown(view.read(file));
      checkDelta(lines, text => issue(`${file}: ${text}`));
    }
    for (const file of files.filter(f => f.endsWith('.md'))) {
      const lines = markdown(view.read(file));
      lines.forEach((line, i) => {
        if (/^\s*(?:[-*]\s+)?(?:TODO|TBD|待补充|待填写)(?:\s*[:：].*|\s*)$/i.test(line) || /<(?:待补充|待填写|填写[^>]*|placeholder)>/i.test(line)) issue(`${file}:${i + 1}: Unfinished placeholder`);
      });
    }
  }
  if (issues.length) throw new Error(issues.join('\n'));
  return { result: 'PASS', checked_changes: requested, mode: staged ? 'index' : 'worktree' };
}
export function commitCheck(repo, messageFile) {
  const message = fs.readFileSync(path.resolve(repo, messageFile), 'utf8').replace(/\r/g, '').trimEnd();
  const first = message.split('\n')[0];
  if (!/^(feat|fix|refactor|docs|test|chore|build|ci|perf|style|revert)\([A-Za-z0-9._/-]+\)!?:\s+\S.*$/.test(first)) throw new Error('Expected <type>(<scope>): <description>');
  const lines = message.split('\n');
  const ids = lines.filter(l => /^Change-Id:/i.test(l));
  const view = snapshot(repo, true);
  const changed = changedFiles(repo);
  const touched = activeChanges(changed);
  const active = activeChanges(view.files);
  if (!ids.length && (touched.length || active.length)) throw new Error('Active OpenSpec work requires one Change-Id trailer, including implementation-only commits');
  if (!ids.length) return { result: 'PASS' };
  if (ids.length !== 1 || !/^Change-Id:\s+\S+$/.test(ids[0])) throw new Error('Expected exactly one Change-Id trailer');
  const trailerBlock = message.split(/\n\s*\n/).at(-1).split('\n');
  if (!trailerBlock.includes(ids[0]) || !trailerBlock.every(l => /^[A-Za-z][A-Za-z0-9-]*:\s+\S/.test(l))) throw new Error('Change-Id must be in the final trailer block');
  const id = changeName(ids[0].replace(/^Change-Id:\s+/, ''));
  if (touched.some(n => n !== id)) throw new Error('Change-Id does not match all staged changes; split the commit');
  const archived = changed.some(f => new RegExp(`^openspec/(?:changes/)?archive/(?:\\d{4}-\\d{2}-\\d{2}-)?${id}/`).test(f));
  if (!active.includes(id) && !archived && !touched.includes(id)) throw new Error(`No active, removed or archived change for ${id}`);
  return { result: 'PASS', change_id: id };
}
