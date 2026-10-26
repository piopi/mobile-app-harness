import { isStaff, launchStatus, type LaunchStatus, type MemberRole } from '@app/shared';
import { useQuery } from '@tanstack/react-query';
import type { Session as AuthSession } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import { queryClient } from './query-client';
import { supabase } from './supabase';

/**
 * Who is signed in and which account gate opens. The Supabase Auth session says whether anyone is signed in;
 * `launch_status()` (the database) says the rest: the gate (`mode`), roles, the terms versions, what the hold
 * screens show. Nothing here is decided on the device.
 *
 * Dev builds: `__agent/session` lays an override on top (`{"mode":"terms"}`, `{"roles":["member","staff"]}`), so
 * agents can open any gate without seeding; `{"real":true}` removes it.
 */
export type Session = {
  /** `loading` until the stored session and the launch status are read; `error` when the database can't be reached. */
  status: 'loading' | 'ready' | 'error';
  mode: LaunchStatus['mode'];
  roles: MemberRole[];
  isStaff: boolean;
  /** The signed-in account's email ("Signed in as"). */
  email: string | null;
  /** Name hints from the identity provider (Apple shares one once; Google always), to prefill onboarding. */
  nameHint: { first: string; last: string } | null;
  launch: LaunchStatus | null;
  /** Retry after an error. */
  refetch: () => void;
};

// ─── The auth session, from supabase-js ────────────────────────────────────────────────────────────
type AuthState = { ready: boolean; session: AuthSession | null };
let auth: AuthState = { ready: false, session: null };
const authListeners = new Set<() => void>();
const setAuth = (next: AuthState) => {
  auth = next;
  authListeners.forEach((l) => l());
};

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    queryClient.clear();
    override = {};
    overrideListeners.forEach((l) => l());
  }
  setAuth({ ready: true, session });
});

function useAuth(): AuthState {
  return useSyncExternalStore(
    (l) => (authListeners.add(l), () => authListeners.delete(l)),
    () => auth,
    () => auth,
  );
}

// ─── Dev override (agents) ─────────────────────────────────────────────────────────────────────────
export type SessionOverride = { mode?: LaunchStatus['mode']; roles?: MemberRole[] };
let override: SessionOverride = {};
const overrideListeners = new Set<() => void>();

/** Dev only (agent events): patch the override, or `null` to drop it and show the real state. */
export function setSessionOverride(patch: SessionOverride | null) {
  override = patch === null ? {} : { ...override, ...patch };
  overrideListeners.forEach((l) => l());
}

function useOverride(): SessionOverride {
  return useSyncExternalStore(
    (l) => (overrideListeners.add(l), () => overrideListeners.delete(l)),
    () => override,
    () => override,
  );
}

// ─── Launch status ─────────────────────────────────────────────────────────────────────────────────
export const LAUNCH_STATUS_KEY = ['launch-status'] as const;

async function fetchLaunchStatus(): Promise<LaunchStatus> {
  const { data, error } = await supabase.rpc('launch_status');
  if (error) throw error;
  return launchStatus.parse(data);
}

/** After anything that can move the member to another gate (onboarding, new terms, an admin change). */
export function refreshLaunchStatus() {
  return queryClient.invalidateQueries({ queryKey: LAUNCH_STATUS_KEY });
}

function nameHint(session: AuthSession | null): Session['nameHint'] {
  const m = (session?.user.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const given = str(m.given_name);
  const family = str(m.family_name);
  if (given || family) return { first: given, last: family };
  const full = str(m.full_name) || str(m.name);
  if (!full) return null;
  const [first = '', ...rest] = full.split(/\s+/);
  return { first, last: rest.join(' ') };
}

export function useSession(): Session {
  const a = useAuth();
  const o = useOverride();
  const userId = a.session?.user.id ?? null;
  const q = useQuery({
    queryKey: [...LAUNCH_STATUS_KEY, userId],
    queryFn: fetchLaunchStatus,
    enabled: a.ready && userId !== null,
    staleTime: 60_000,
  });

  let status: Session['status'];
  let mode: LaunchStatus['mode'] = 'signed_out';
  if (!a.ready) status = 'loading';
  else if (!userId) status = 'ready';
  else if (q.data) {
    status = 'ready';
    mode = q.data.mode;
  } else status = q.isError ? 'error' : 'loading';

  if (o.mode) {
    status = 'ready';
    mode = o.mode;
  }
  const roles = o.roles ?? q.data?.roles ?? ['member'];
  return {
    status,
    mode,
    roles,
    isStaff: isStaff(roles),
    email: q.data?.email ?? a.session?.user.email ?? null,
    nameHint: nameHint(a.session),
    launch: q.data ?? null,
    refetch: () => void q.refetch(),
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}

/** Test helper. */
export function resetSessionForTests(next: AuthState = { ready: true, session: null }) {
  override = {};
  setAuth(next);
}
