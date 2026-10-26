#!/usr/bin/env node
// Reset this worktree's database to a named scenario: base seed (supabase/seed.sql) + seeds/scenarios/<name>.sql.
//   pnpm seed               list scenarios
//   pnpm seed <scenario>    reset, then apply the scenario
//   pnpm seed base          reset to the base seed only
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { readEnv, ROOT } from './lib/env.mjs';

const dir = path.join(ROOT, 'supabase/seeds/scenarios');
const scenarios = readdirSync(dir).filter((f) => f.endsWith('.sql')).map((f) => f.slice(0, -4)).sort();
const name = process.argv[2];

if (!name) {
  for (const s of scenarios) {
    const first = readFileSync(path.join(dir, `${s}.sql`), 'utf8').split('\n').find((l) => l.startsWith('-- sign-in:'));
    console.log(`${s.padEnd(18)} ${first?.replace('-- ', '') ?? ''}`);
  }
  process.exit(0);
}
if (name !== 'base' && !scenarios.includes(name)) {
  console.error(`unknown scenario "${name}". Known: ${scenarios.join(', ')}`);
  process.exit(2);
}

const t0 = Date.now();
const reset = spawnSync('supabase', ['db', 'reset', '--local', '--yes'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, SUPABASE_EXPERIMENTAL_STACK: '1' },
});
if (reset.status !== 0) {
  process.stderr.write(reset.stdout + reset.stderr);
  process.exit(reset.status ?? 1);
}

const { DB_URL } = readEnv();
if (!DB_URL || !existsSync(path.join(ROOT, '.env.local'))) {
  console.error('no DB_URL in .env.local: run `pnpm sb start` (or `pnpm wt up`) first');
  process.exit(1);
}
const sql = name === 'base' ? '' : readFileSync(path.join(dir, `${name}.sql`), 'utf8');
const client = new pg.Client({ connectionString: DB_URL });
await client.connect();
try {
  if (sql) await client.query(sql);
} finally {
  await client.end();
}
const signIn = sql.split('\n').find((l) => l.startsWith('-- sign-in:'))?.replace('-- sign-in:', '').trim();
console.log(`seeded "${name}" in ${((Date.now() - t0) / 1000).toFixed(1)}s${signIn ? ` · sign in as ${signIn} / password123` : ''}`);
