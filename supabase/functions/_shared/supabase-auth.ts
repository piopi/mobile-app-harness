/**
 * The headers every Edge Function sends to its own Supabase project (PostgREST, Storage), as the service role or as
 * the signed-in user, for both kinds of API key.
 *
 * Legacy keys (local stacks): `anon` and `service_role` are JWTs, sent as `apikey` and `Authorization: Bearer`.
 * New keys (`sb_publishable_…`, `sb_secret_…`; new hosted projects): they are not JWTs. They go on `apikey` only and
 * the gateway swaps them for a short-lived JWT of the matching role. Sent as a bearer, PostgREST answers 401
 * "Expected 3 parts in JWT; got 1". Local stacks still use legacy JWT keys, so that bug only shows on a hosted
 * project: every call goes through this file, and its tests fake the hosted gateway.
 *
 * Keys come from the documented dictionaries (`SUPABASE_SECRET_KEYS`, `SUPABASE_PUBLISHABLE_KEYS`: JSON keyed by key
 * name, `default` first), then the single legacy variables (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`).
 * https://supabase.com/docs/guides/api/api-keys, https://supabase.com/docs/guides/functions/secrets
 */
export type Env = { get(name: string): string | undefined };

/** Call as the service role (RLS bypassed): pass this where a call takes `As`. */
export const SERVICE: unique symbol = Symbol('service role');

/** Who a call runs as: the service role, or the user through their own `Authorization` header (RLS applies). */
export type As = typeof SERVICE | string;

/** Three dot-separated parts: a legacy JWT key (or a user's access token). */
export const isJwt = (value: string) => value.split('.').length === 3;

/** Every key in a `SUPABASE_*_KEYS` dictionary, `default` first; none when unset or malformed. */
function keysOf(env: Env, name: string): string[] {
  const raw = env.get(name);
  if (!raw) return [];
  try {
    const dict = JSON.parse(raw) as Record<string, unknown>;
    const values = Object.entries(dict)
      .sort(([a], [b]) => (a === 'default' ? -1 : b === 'default' ? 1 : 0))
      .map(([, v]) => v);
    return values.filter((v): v is string => typeof v === 'string' && v.length > 0);
  } catch {
    return [];
  }
}

/** The key the functions use as the service role, or null when none is set. */
export const serviceKey = (env: Env): string | null => keysOf(env, 'SUPABASE_SECRET_KEYS')[0] ?? env.get('SUPABASE_SERVICE_ROLE_KEY') ?? null;

/** The client key a user's call goes with, or null when none is set. */
export const publicKey = (env: Env): string | null => keysOf(env, 'SUPABASE_PUBLISHABLE_KEYS')[0] ?? env.get('SUPABASE_ANON_KEY') ?? null;

/** The service-role headers: `apikey` always, `Authorization: Bearer` only for a legacy JWT key. */
export function serviceHeaders(key: string): Record<string, string> {
  return isJwt(key) ? { apikey: key, authorization: `Bearer ${key}` } : { apikey: key };
}

/**
 * The auth headers for a call `as` the service role or a user, or null when the project's keys aren't set (the
 * caller answers its own 503). A user's empty header sends the client key alone (anonymous).
 */
export function supabaseHeaders(env: Env, as: As): Record<string, string> | null {
  if (as === SERVICE) {
    const key = serviceKey(env);
    return key ? serviceHeaders(key) : null;
  }
  const apikey = publicKey(env);
  if (!apikey) return null;
  return as ? { apikey, authorization: as } : { apikey };
}

/**
 * Call a database function (PostgREST `/rest/v1/rpc/<name>`) as the service role or a user. Throws on a non-2xx
 * answer with PostgREST's message, so a 401 from a misplaced key never passes silently.
 */
export async function rpc<T = unknown>(env: Env, name: string, args: Record<string, unknown>, as: As, fetchFn: typeof fetch = fetch): Promise<T> {
  const url = env.get('SUPABASE_URL');
  const headers = supabaseHeaders(env, as);
  if (!url || !headers) throw new Error('supabase_not_configured');
  const res = await fetchFn(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(`rpc ${name}: ${res.status} ${body.message ?? ''}`.trim());
  }
  return (await res.json()) as T;
}

/** Constant-time string equality (key comparison). */
function same(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/** The `role` claim of a JWT, unverified (the gateway verifies it where verify_jwt is on). */
function roleOf(token: string): string | null {
  try {
    const payload = token.split('.')[1] ?? '';
    return (JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

/**
 * Whether a request comes from a scheduler or another server holding the service role: a service-role JWT (legacy
 * key; the gateway verified it), or one of the project's secret keys on `apikey` or as a bearer (new keys are not
 * JWTs, and the gateway's verify_jwt lets them through without authenticating them, so they are checked here).
 */
export function isServiceCaller(req: Request, env: Env): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (bearer && isJwt(bearer)) return roleOf(bearer) === 'service_role';
  const secrets = [...keysOf(env, 'SUPABASE_SECRET_KEYS'), env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''].filter((k) => k && !isJwt(k));
  const offered = [req.headers.get('apikey') ?? '', bearer].filter(Boolean);
  return offered.some((o) => secrets.some((k) => same(o, k)));
}
