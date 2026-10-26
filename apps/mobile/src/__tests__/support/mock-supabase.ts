// A stand-in for src/lib/supabase in Jest: auth calls and RPCs are jest.fn()s a test programs, and
// `emitAuth` plays supabase-js's onAuthStateChange. Use with:
//   jest.mock('../lib/supabase', () => require('./support/mock-supabase'));
type Listener = (event: string, session: unknown) => void;
const listeners: Listener[] = [];

type Result = { data: unknown; error: unknown };
const ok = (data: unknown = null): Result => ({ data, error: null });

/** A query builder that resolves to the next programmed result for `table`. */
const tables = new Map<string, Result>();
function builder(table: string) {
  const result = () => Promise.resolve(tables.get(table) ?? ok([]));
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'neq', 'order', 'limit']) b[m] = () => b;
  b.single = result;
  b.maybeSingle = result;
  b.then = (res: (r: Result) => unknown, rej: (e: unknown) => unknown) => result().then(res, rej);
  return b;
}

export const supabase = {
  auth: {
    onAuthStateChange: jest.fn((cb: Listener) => {
      listeners.push(cb);
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
    signInWithOtp: jest.fn(async () => ok({})),
    verifyOtp: jest.fn(async () => ok({ session: { user: { id: 'u1' } } })),
    signInWithPassword: jest.fn(async () => ok({})),
    signInWithIdToken: jest.fn(async () => ok({})),
    signUp: jest.fn(async () => ok({})),
    updateUser: jest.fn(async () => ok({})),
    signOut: jest.fn(async () => ok()),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
  },
  rpc: jest.fn(async (_name: string, _args?: unknown) => ok(null)),
  from: jest.fn((table: string) => builder(table)),
};

export function setTable(table: string, data: unknown, error: unknown = null) {
  tables.set(table, { data, error });
}

export function emitAuth(event: string, session: unknown) {
  listeners.forEach((l) => l(event, session));
}

export function fakeSession(email = 'olly@app.test', metadata: Record<string, unknown> = {}) {
  return { access_token: 't', user: { id: `user-${email}`, email, user_metadata: metadata } };
}

/** RPCs answer by name through `others` (default: null data). */
export function routeRpc(others: (name: string, args?: unknown) => Result = () => ok(null)) {
  supabase.rpc.mockImplementation(async (name: string, args?: unknown) => others(name, args));
}
