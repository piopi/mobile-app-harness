#!/usr/bin/env node
// Supabase for this worktree, in stack mode (CLI 2.122.0). Every stack start regenerates .env.local.
//   pnpm sb start      start (or resume) this worktree's stack, then write .env.local files
//   pnpm sb stop       stop it, keeping its data
//   pnpm sb destroy    delete it (use before `git worktree remove`)
//   pnpm sb env        rewrite .env.local from the running stack
//   pnpm sb <args...>  any other supabase command, run from the repo root
import { spawnSync } from 'node:child_process';
import { readEnv, regenerateEnv, ROOT } from './lib/env.mjs';

const env = { ...process.env, SUPABASE_EXPERIMENTAL_STACK: '1' };
const sb = (...args) => {
  const r = spawnSync('supabase', args, { cwd: ROOT, stdio: 'inherit', env });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
const slot = () => {
  const e = readEnv();
  return { k: e.WT_SLOT, metroPort: e.METRO_PORT };
};

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case 'start':
    sb('stack', 'start', '--runtime', 'docker', '--output-format', 'text', ...rest);
    regenerateEnv(slot());
    console.log('wrote .env.local and apps/mobile/.env.local');
    break;
  case 'stop':
    sb('stack', 'stop', ...rest);
    break;
  case 'destroy':
    sb('stack', 'destroy', '--yes', ...rest);
    break;
  case 'env':
    regenerateEnv(slot());
    break;
  case undefined:
    console.error('usage: pnpm sb start|stop|destroy|env|<supabase args>');
    process.exit(2);
    break;
  default:
    sb(cmd, ...rest);
}
