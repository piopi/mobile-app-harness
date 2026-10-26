// Shared helpers for the API integration tests (Vitest against this worktree's local stack).
//
//   asRole('member' | 'staff' | 'admin' | 'anon')                   a supabase-js client signed in as a seeded account
//   signIn(email)                                                    the same for any seeded email (password123)
//   useScenario(name)                                                reset the database to a seed scenario before this file's tests
//   db                                                               a postgres connection (setup and assertions only, bypasses RLS)
//   expectForbidden / expectRpcError                                 assert the RPC error contract (42501 / P0001 + code)
//
// API_URL, ANON_KEY and DB_URL come from .env.local (`pnpm sb start`); `pnpm test:integration` loads it.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';
import { afterAll, beforeAll, expect } from 'vitest';
import type { Database } from '../../../../packages/shared/src/database.types';

const url = process.env.API_URL;
const anonKey = process.env.ANON_KEY;
const dbUrl = process.env.DB_URL;
if (!url || !anonKey || !dbUrl) throw new Error('API_URL, ANON_KEY and DB_URL must be set: run `pnpm sb start` first');

export type Client = SupabaseClient<Database>;
export type Role = 'member' | 'staff' | 'admin' | 'anon';

/** The seeded account behind each role (supabase/seed.sql). */
export const ACCOUNTS = {
  member: 'member@app.test',
  staff: 'staff@app.test',
  admin: 'admin@app.test',
} as const;

/** Member ids from the base seed. */
export const IDS = {
  member: '00000000-0000-4000-9000-0000000000a1',
  member2: '00000000-0000-4000-9000-0000000000b2',
  staff: '00000000-0000-4000-9000-00000000005a',
  admin: '00000000-0000-4000-9000-0000000000ad',
} as const;


export function anon(): Client {
  return createClient<Database>(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function signIn(email: string): Promise<Client> {
  const client = anon();
  const { error } = await client.auth.signInWithPassword({ email, password: 'password123' });
  if (error) throw new Error(`sign-in as ${email} failed: ${error.message}`);
  return client;
}

// One signed-in client per role per file (sign-ins are rate limited); useScenario clears it.
const roleClients = new Map<Role, Promise<Client>>();

export function asRole(role: Role): Promise<Client> {
  if (role === 'anon') return Promise.resolve(anon());
  let client = roleClients.get(role);
  if (!client) {
    client = signIn(ACCOUNTS[role]);
    roleClients.set(role, client);
  }
  return client;
}

/** A brand-new account through the real sign-up path (the auth trigger creates the member row). */
export async function newAccount(prefix = 'tmp'): Promise<{ client: Client; email: string }> {
  const email = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@app.test`;
  const client = anon();
  const { data, error } = await client.auth.signUp({ email, password: 'password123' });
  if (error || !data.session) throw new Error(`sign-up failed: ${error?.message ?? 'no session'}`);
  return { client, email };
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/** Reset this worktree's database to a scenario (`pnpm seed <name>`) once, before this file's tests. */
export function useScenario(name: string): void {
  beforeAll(() => {
    roleClients.clear();
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/seed.mjs'), name], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`pnpm seed ${name} failed:\n${r.stdout}${r.stderr}`);
  }, 120_000);
}

/** A direct postgres connection for setup and assertions (as `postgres`, so RLS does not apply). */
export const db = {
  pool: null as pg.Pool | null,
  get(): pg.Pool {
    this.pool ??= new pg.Pool({ connectionString: dbUrl, max: 2 });
    return this.pool;
  },
  async query<T extends pg.QueryResultRow = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
    return (await this.get().query<T>(text, params)).rows;
  },
  async one<T extends pg.QueryResultRow = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T> {
    const rows = await this.query<T>(text, params);
    if (!rows[0]) throw new Error(`no row for: ${text}`);
    return rows[0];
  },
};
afterAll(async () => {
  await db.pool?.end();
  db.pool = null;
});

type RpcResult = { error: PostgrestError | null };

export function expectForbidden(result: RpcResult, code?: string): void {
  expect(result.error, 'expected a 42501 error').not.toBeNull();
  expect(result.error!.code).toBe('42501');
  if (code) expect(result.error!.message).toBe(code);
}

export function expectRpcError(result: RpcResult, code: string): void {
  expect(result.error, `expected ${code}`).not.toBeNull();
  expect(result.error!.code).toBe('P0001');
  expect(result.error!.message).toBe(code);
}

export function expectOk<T extends RpcResult>(result: T): T {
  expect(result.error).toBeNull();
  return result;
}
