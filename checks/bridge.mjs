#!/usr/bin/env node
import { repository, formatCheck, commitCheck } from './lib.mjs';
import { fingerprint, ready } from './evidence.mjs';
import { install, doctor, uninstall, runtime } from './install.mjs';
import { specFingerprint, planFingerprint } from './context.mjs';
import { route } from './workflow.mjs';

try {
  const [command, ...args] = process.argv.slice(2);
  const options = {};
  const allowed = new Set(command === 'format' ? ['--repo', '--change', '--staged'] : command === 'commit' ? ['--repo', '--message-file'] : ['ready', 'spec-fingerprint'].includes(command) ? ['--repo', '--change'] : command === 'plan-fingerprint' ? ['--repo', '--plan'] : command === 'route' ? ['--repo', '--change', '--intent'] : ['--repo']);
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!allowed.has(key) || key in options) throw new Error(`Unknown/duplicate option: ${key}`);
    if (key === '--staged') options[key] = true;
    else {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`Missing value: ${key}`);
      options[key] = value;
    }
  }
  if (!options['--repo']) throw new Error('Required: --repo <repository-root>');
  const repo = repository(options['--repo']);
  let result;
  switch (command) {
    case 'format': result = formatCheck(repo, { change: options['--change'], staged: options['--staged'] }); break;
    case 'commit':
      if (!options['--message-file']) throw new Error('Required: --message-file');
      result = commitCheck(repo, options['--message-file']); break;
    case 'fingerprint': result = fingerprint(repo); break;
    case 'route': result = route(repo, { change: options['--change'], intent: options['--intent'] }); break;
    case 'plan-fingerprint': result = planFingerprint(repo, options['--plan']); break;
    case 'spec-fingerprint':
      if (!options['--change']) throw new Error('Required: --change');
      result = specFingerprint(repo, options['--change']); break;
    case 'ready':
      if (!options['--change']) throw new Error('Required: --change');
      formatCheck(repo, { change: options['--change'] });
      result = ready(repo, options['--change']); break;
    case 'runtime': result = runtime(repo); break;
    case 'install': result = install(repo); break;
    case 'doctor': result = doctor(repo); break;
    case 'uninstall': result = uninstall(repo); break;
    default: throw new Error('Usage: bridge.mjs <runtime|route|spec-fingerprint|plan-fingerprint|format|commit|fingerprint|ready|install|doctor|uninstall> --repo <root>');
  }
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({ result: 'FAILED', error: error.message }));
  process.exitCode = 1;
}
