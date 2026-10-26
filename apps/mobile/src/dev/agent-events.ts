/**
 * Dev-only agent hook: `<scheme>://__agent/<event>?payload=<json>` flips client-only state so agents can
 * screenshot states a seed cannot produce (offline, theme, time travel, a session override), and signs in to a
 * seeded account in one step (`sign-in`). `pnpm agent <event> [json]` sends one to this slot's device.
 * Release builds ignore these links (see +native-intent.tsx and the test).
 *
 *   pnpm agent offline
 *   pnpm agent theme '{"theme":"dark"}'
 *   AGENT_DEVICE_APP_EVENT_URL_TEMPLATE='<scheme>://__agent/{event}?payload={payload}' agent-device trigger-app-event theme '{"theme":"dark"}'
 *
 * A new client-only state (a fake native result, a permission answer) gets an event here, a unit test, and a row in
 * the verify-in-app skill's table.
 */
import { useSyncExternalStore } from 'react';
import { launchMode, memberRole } from '@app/shared';
import { z } from 'zod';
import { DEFAULT_APPEARANCE } from '../lib/app';

export const themeName = z.enum(['light', 'dark', 'system']);

/** Every event and its payload. Add new events here; the agent skill lists this table. */
export const agentEventPayloads = {
  offline: z.object({}).optional(),
  online: z.object({}).optional(),
  theme: z.object({ theme: themeName }),
  'time-travel': z.object({ iso: z.iso.datetime({ offset: true }).optional(), offsetMinutes: z.number().optional() }).optional(),
  refetch: z.object({}).optional(),
  reset: z.object({}).optional(),
  /**
   * Override the real session (dev only): which account gate shows, the roles (staff-only UI).
   * `{"real":true}` drops the override and shows what the database says.
   */
  session: z.object({
    mode: launchMode.optional(),
    roles: z.array(memberRole).optional(),
    real: z.literal(true).optional(),
  }),
  /** Sign in to this slot's stack as a seeded account (password123 unless given): `{"email":"member@app.test"}`. */
  'sign-in': z.object({ email: z.email(), password: z.string().min(1).optional() }),
  /** Sign out (Supabase Auth), back to the sign-in gate. */
  'sign-out': z.object({}).optional(),
  /** Demo recordings (`pnpm demo`): hide the dev-only panels (seeded accounts, the harness cards). `{"on":false}` shows them. */
  demo: z.object({ on: z.boolean().default(true) }).optional(),
  /** `plain: true` drops our NativeTabs / header branding, for side-by-side shots against the system default. */
  chrome: z.object({ plain: z.boolean() }),
} as const;

export type AgentEventName = keyof typeof agentEventPayloads;
export const AGENT_EVENTS = Object.keys(agentEventPayloads) as AgentEventName[];

export interface AgentState {
  offline: boolean;
  theme: z.infer<typeof themeName>;
  clockOffsetMs: number;
  plainChrome: boolean;
  demo: boolean;
  lastEvent: string | null;
}

const INITIAL: AgentState = {
  offline: false,
  theme: DEFAULT_APPEARANCE,
  clockOffsetMs: 0,
  plainChrome: false,
  demo: false,
  lastEvent: null,
};

let state = INITIAL;
const listeners = new Set<() => void>();

export function getAgentState(): AgentState {
  return state;
}

function setState(next: Partial<AgentState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function subscribeAgentState(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAgentState(): AgentState {
  return useSyncExternalStore(subscribeAgentState, getAgentState, getAgentState);
}

/** Side effects the app wires in once (providers): theme, network, query cache. */
export interface AgentEffects {
  setTheme: (theme: AgentState['theme']) => void;
  setOnline: (online: boolean) => void;
  refetch: () => void;
  /** Patch the session override (src/lib/session.ts). */
  setSession?: (patch: SessionPatch) => void;
  signIn?: (email: string, password?: string) => void;
  signOut?: () => void;
}

export type SessionPatch = z.infer<(typeof agentEventPayloads)['session']>;

let effects: AgentEffects | null = null;
export function registerAgentEffects(e: AgentEffects) {
  effects = e;
}

/** Parse `<scheme>://__agent/<event>?payload=…` or `/__agent/<event>?payload=…`. Null when not an agent link. */
export function parseAgentLink(url: string): { event: string; payload: unknown } | null {
  const m = url.match(/(?:^|\/)__agent\/([a-z-]+)(?:\?(.*))?$/);
  if (!m) return null;
  const params = new URLSearchParams(m[2] ?? '');
  const raw = params.get('payload');
  let payload: unknown = undefined;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = undefined;
    }
  }
  return { event: m[1]!, payload };
}

/** Apply an agent event. Returns false (and changes nothing) for unknown events or bad payloads. */
export function dispatchAgentEvent(event: string, payload: unknown, now: () => number = Date.now): boolean {
  if (!(event in agentEventPayloads)) return false;
  const name = event as AgentEventName;
  const parsed = agentEventPayloads[name].safeParse(payload);
  if (!parsed.success) return false;
  const data = parsed.data as Record<string, unknown> | undefined;

  switch (name) {
    case 'offline':
    case 'online': {
      const offline = name === 'offline';
      setState({ offline });
      effects?.setOnline(!offline);
      break;
    }
    case 'theme': {
      const theme = (data as { theme: AgentState['theme'] }).theme;
      setState({ theme });
      effects?.setTheme(theme);
      break;
    }
    case 'time-travel': {
      const d = (data ?? {}) as { iso?: string; offsetMinutes?: number };
      const clockOffsetMs = d.iso ? new Date(d.iso).getTime() - now() : (d.offsetMinutes ?? 0) * 60_000;
      setState({ clockOffsetMs });
      break;
    }
    case 'session':
      effects?.setSession?.(data as SessionPatch);
      break;
    case 'sign-in': {
      const d = data as { email: string; password?: string };
      effects?.signIn?.(d.email, d.password);
      break;
    }
    case 'sign-out':
      effects?.signOut?.();
      break;
    case 'demo':
      setState({ demo: (data as { on?: boolean } | undefined)?.on ?? true });
      break;
    case 'chrome':
      setState({ plainChrome: (data as { plain: boolean }).plain });
      break;
    case 'refetch':
      effects?.refetch();
      break;
    case 'reset':
      effects?.setOnline(true);
      effects?.setTheme(DEFAULT_APPEARANCE);
      state = INITIAL;
      break;
  }
  setState({ lastEvent: name });
  return true;
}

/** Handle a deep link. Only in development builds: release builds never act on agent links. */
export function handleAgentLink(url: string, isDev: boolean): boolean {
  if (!isDev) return false;
  const link = parseAgentLink(url);
  if (!link) return false;
  dispatchAgentEvent(link.event, link.payload);
  return true;
}

/** Test helper. */
export function resetAgentStateForTests() {
  state = INITIAL;
  effects = null;
}
