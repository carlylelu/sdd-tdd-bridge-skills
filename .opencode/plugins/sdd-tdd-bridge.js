/**
 * sdd-tdd-bridge plugin for OpenCode / CodeFree-O / CodeFree Space
 *
 * Registers the skills/ directory via config hook so OpenCode discovers
 * all 4 bridge stage skills automatically — no symlinks needed.
 *
 * The 4 skills form the OpenSpec-Superpowers bridge pipeline:
 *   bridge-load-context-skill → bridge-planning-skill
 *   → bridge-spec-compliance-check-skill (per Task)
 *   → bridge-dual-verify-skill (final)
 *
 * Main Agent (agents/bridge_agent.md) orchestrates stage routing;
 * deterministic checks (checks/) validate OpenSpec artifact format;
 * Git Hooks (hooks/) enforce commit message format.
 * Dual verification (OpenSpec verify + Superpowers verification) is a hard gate before archive.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SddTddBridgePlugin = async ({ client, directory }) => {
  const skillsDir = path.resolve(__dirname, '../../skills');

  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
      }
    }
  };
};

export default SddTddBridgePlugin;
