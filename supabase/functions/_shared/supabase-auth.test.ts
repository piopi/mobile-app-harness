// `pnpm test:functions` (deno test): the headers every function sends to its own project, for legacy JWT keys (local
// stacks) and new keys (sb_secret_…, new hosted projects). The fake PostgREST below answers as the hosted gateway
// does: a key that isn't a JWT sent as a bearer is a 401. A local stack never shows this, so these tests are the
// only place it can fail before production. Route every new call site through `supabaseHeaders` or `rpc`.
import { assert, assertEquals, assertFalse, assertRejects } from 'jsr:@std/assert@1.0.13';
import { isJwt, isServiceCaller, publicKey, rpc, SERVICE, serviceKey, supabaseHeaders } from './supabase-auth.ts';

const env = (values: Record<string, string>) => ({ get: (name: string) => values[name] });
const b64url = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (role: string) => `${b64url({ alg: 'HS256' })}.${b64url({ role })}.signature`;

const LEGACY_SERVICE = jwt('service_role');
const LEGACY_ANON = jwt('anon');
const USER = `Bearer ${jwt('authenticated')}`;
const SECRET = 'sb_secret_abc123';
const PUBLISHABLE = 'sb_publishable_xyz789';

/** A new hosted project as the platform sets it up: the dictionaries, and the single variables holding new keys too. */
const NEW = env({
  SUPABASE_URL: 'http://db',
  SUPABASE_SECRET_KEYS: JSON.stringify({ default: SECRET }),
  SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: PUBLISHABLE }),
  SUPABASE_SERVICE_ROLE_KEY: SECRET,
  SUPABASE_ANON_KEY: PUBLISHABLE,
});
/** Only the single variables, holding new keys: the setup that broke production when a key went out as a bearer. */
const BARE = env({ SUPABASE_URL: 'http://db', SUPABASE_SERVICE_ROLE_KEY: SECRET, SUPABASE_ANON_KEY: PUBLISHABLE });
const LEGACY = env({ SUPABASE_URL: 'http://db', SUPABASE_SERVICE_ROLE_KEY: LEGACY_SERVICE, SUPABASE_ANON_KEY: LEGACY_ANON });

type Call = { url: string; headers: Headers };

/** A fake PostgREST that refuses a bearer that isn't a JWT, as the hosted gateway does. */
function fakeProject(answers: Record<string, unknown> = {}) {
  const calls: Call[] = [];
  const fetchFn = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({ url, headers });
    const bearer = headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (bearer && !isJwt(bearer)) return Response.json({ code: 'PGRST301', message: 'Expected 3 parts in JWT; got 1' }, { status: 401 });
    if (!headers.get('apikey')) return Response.json({ message: 'No API key found in request' }, { status: 401 });
    const name = new URL(url).pathname.split('/').pop()!;
    return Response.json(name in answers ? answers[name] : null);
  }) as typeof fetch;
  return { calls, fetchFn };
}

const auth = (c: Call) => [c.headers.get('apikey'), c.headers.get('authorization')];

Deno.test('service role, legacy JWT key: apikey and Authorization: Bearer, as local stacks always did', () => {
  assertEquals(supabaseHeaders(LEGACY, SERVICE), { apikey: LEGACY_SERVICE, authorization: `Bearer ${LEGACY_SERVICE}` });
});

Deno.test('service role, sb_secret key: apikey only, never a bearer', () => {
  assertEquals(supabaseHeaders(NEW, SERVICE), { apikey: SECRET });
  assertEquals(supabaseHeaders(BARE, SERVICE), { apikey: SECRET });
});

Deno.test('the documented dictionaries win over the legacy variables; default first, then any key', () => {
  const both = env({ SUPABASE_SECRET_KEYS: JSON.stringify({ default: SECRET }), SUPABASE_SERVICE_ROLE_KEY: LEGACY_SERVICE });
  assertEquals(serviceKey(both), SECRET);
  assertEquals(serviceKey(env({ SUPABASE_SECRET_KEYS: JSON.stringify({ cron: 'sb_secret_b', default: 'sb_secret_a' }) })), 'sb_secret_a');
  assertEquals(serviceKey(env({ SUPABASE_SECRET_KEYS: JSON.stringify({ cron: 'sb_secret_b' }) })), 'sb_secret_b');
  assertEquals(serviceKey(env({ SUPABASE_SECRET_KEYS: 'not json', SUPABASE_SERVICE_ROLE_KEY: LEGACY_SERVICE })), LEGACY_SERVICE);
  assertEquals(publicKey(env({ SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: PUBLISHABLE }), SUPABASE_ANON_KEY: LEGACY_ANON })), PUBLISHABLE);
  assertEquals(publicKey(LEGACY), LEGACY_ANON);
});

Deno.test('a user call: the client key on apikey, the user’s own JWT as the bearer, for either kind of key', () => {
  assertEquals(supabaseHeaders(NEW, USER), { apikey: PUBLISHABLE, authorization: USER });
  assertEquals(supabaseHeaders(LEGACY, USER), { apikey: LEGACY_ANON, authorization: USER });
  assertEquals(supabaseHeaders(NEW, ''), { apikey: PUBLISHABLE });
});

Deno.test('no keys, no headers (the caller answers its 503)', () => {
  assertEquals(supabaseHeaders(env({}), SERVICE), null);
  assertEquals(supabaseHeaders(env({}), USER), null);
});

Deno.test('rpc: the hosted gateway accepts the service role with an sb_secret key, and a user with their JWT', async () => {
  const { calls, fetchFn } = fakeProject({ purge_cache: 2, my_profile: { id: 'u1' } });
  assertEquals(await rpc(BARE, 'purge_cache', {}, SERVICE, fetchFn), 2);
  assertEquals(await rpc(NEW, 'my_profile', {}, USER, fetchFn), { id: 'u1' });
  assertEquals(calls.map(auth), [
    [SECRET, null],
    [PUBLISHABLE, USER],
  ]);
  const legacy = fakeProject({ purge_cache: 0 });
  await rpc(LEGACY, 'purge_cache', {}, SERVICE, legacy.fetchFn);
  assertEquals(legacy.calls.map(auth), [[LEGACY_SERVICE, `Bearer ${LEGACY_SERVICE}`]]);
});

Deno.test('rpc: a refused key is an error, never a silent null', async () => {
  const { fetchFn } = fakeProject();
  const wrong = { get: (n: string) => (n === 'SUPABASE_URL' ? 'http://db' : undefined) };
  await assertRejects(() => rpc(wrong, 'purge_cache', {}, SERVICE, fetchFn), Error, 'supabase_not_configured');
  const bearerSecret = ((input: string | URL | Request, init?: RequestInit) =>
    fetchFn(input, { ...init, headers: { ...(init?.headers as Record<string, string>), authorization: `Bearer ${SECRET}` } })) as typeof fetch;
  await assertRejects(() => rpc(NEW, 'purge_cache', {}, SERVICE, bearerSecret), Error, 'Expected 3 parts in JWT');
});

Deno.test('a service caller: a service_role JWT, or one of the project’s secret keys on apikey or as a bearer', () => {
  const req = (headers: Record<string, string>) => new Request('http://fn', { method: 'POST', headers });
  assert(isServiceCaller(req({ authorization: `Bearer ${LEGACY_SERVICE}` }), LEGACY));
  assert(isServiceCaller(req({ apikey: SECRET }), NEW));
  assert(isServiceCaller(req({ authorization: `Bearer ${SECRET}` }), NEW));
  assert(isServiceCaller(req({ apikey: SECRET }), BARE));
  assertFalse(isServiceCaller(req({ authorization: USER, apikey: PUBLISHABLE }), NEW));
  assertFalse(isServiceCaller(req({ apikey: PUBLISHABLE }), NEW));
  assertFalse(isServiceCaller(req({ apikey: 'sb_secret_abc124' }), NEW));
  assertFalse(isServiceCaller(req({ apikey: SECRET.slice(0, -1) }), NEW));
  assertFalse(isServiceCaller(req({}), NEW));
  // A legacy JWT key is never accepted by comparison: only its verified role counts.
  assertFalse(isServiceCaller(req({ apikey: LEGACY_ANON }), LEGACY));
});
