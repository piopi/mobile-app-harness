#!/usr/bin/env node
// Run a command with the worktree's .env.local loaded: `node scripts/with-env.mjs vitest run ...`.
import { spawnSync } from 'node:child_process';
import { readEnv, ROOT } from './lib/env.mjs';

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
  console.error('usage: with-env.mjs <command> [args...]');
  process.exit(2);
}
const r = spawnSync(cmd, args, { cwd: process.cwd() || ROOT, stdio: 'inherit', env: { ...readEnv(), ...process.env } });
process.exit(r.status ?? 1);
