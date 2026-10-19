/**
 * sdd-tdd-bridge plugin for OpenCode / CodeFree-O / CodeFree Space
 *
 * Registers skills and a primary agent via the config hook.
 *
 * The 6 skills form the OpenSpec-Superpowers bridge pipeline:
 *   bridge-explore-skill → bridge-proposal-skill
 *   → bridge-load-context-skill → bridge-planning-skill
 *   → bridge-spec-compliance-check-skill (per Task)
 *   → bridge-dual-verify-skill (final)
 *
 * Main Agent (agents/bridge_agent.md) orchestrates stage routing;
 * deterministic checks (checks/) validate OpenSpec artifact format;
 * Git Hooks (hooks/) enforce commit message format.
 * The agent invokes ready before archive; this plugin cannot intercept other archive entry points.
 */

import path from 'path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SddTddBridgePlugin = async () => {
  const skillsDir = path.resolve(__dirname, '../../skills');
  const agent = await fs.readFile(path.resolve(__dirname, '../../agents/bridge_agent.md'), 'utf8');
  const contract = await fs.readFile(path.join(skillsDir, 'bridge-load-context-skill/references/workflow.md'), 'utf8');
  const prompt = agent.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '') + '\n\n' + contract;

  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
      }
      config.agent = config.agent || {};
      config.agent.bridge_agent = {
        description: 'OpenSpec-Superpowers bridge orchestrator',
        mode: 'primary',
        prompt,
        ...config.agent.bridge_agent
      };
    }
  };
};

export default SddTddBridgePlugin;
