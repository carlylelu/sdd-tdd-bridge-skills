#!/usr/bin/env node
import { repository, formatCheck, commitCheck } from './lib.mjs';
import { fingerprint, ready } from './evidence.mjs';
import { install, doctor, uninstall } from './install.mjs';

try {
  const [command, ...args] = process.argv.slice(2);
  const options = {};
  const allowed = new Set(command === 'format' ? ['--repo', '--change', '--staged'] : command === 'commit' ? ['--repo', '--message-file'] : command === 'ready' ? ['--repo', '--change'] : ['--repo']);
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
    case 'ready':
      if (!options['--change']) throw new Error('Required: --change');
      formatCheck(repo, { change: options['--change'] });
      result = ready(repo, options['--change']); break;
    case 'install': result = install(repo); break;
    case 'doctor': result = doctor(repo); break;
    case 'uninstall': result = uninstall(repo); break;
    default: throw new Error('Usage: bridge.mjs <format|commit|fingerprint|ready|install|doctor|uninstall> --repo <root>');
  }
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({ result: 'FAILED', error: error.message }));
  process.exitCode = 1;
}
