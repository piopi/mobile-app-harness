import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { dispatchAgentEvent, registerAgentEffects, resetAgentStateForTests } from '../dev/agent-events';
import { queryClient } from '../lib/query-client';
import { resetSessionForTests, setSessionOverride, useSession } from '../lib/session';
import { emitAuth, fakeSession, supabase } from './support/mock-supabase';

jest.mock('../lib/supabase', () => require('./support/mock-supabase'));

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
const launch = (data: unknown) => supabase.rpc.mockResolvedValue({ data, error: null });

beforeEach(() => {
  queryClient.clear();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  resetSessionForTests({ ready: false, session: null });
  resetAgentStateForTests();
  supabase.rpc.mockReset();
});

describe('session', () => {
  it('is loading until supabase-js reports the stored session', async () => {
    const { result } = await renderHook(() => useSession(), { wrapper });
    expect(result.current.status).toBe('loading');
    await act(() => emitAuth('INITIAL_SESSION', null));
    expect(result.current).toMatchObject({ status: 'ready', mode: 'signed_out' });
  });

  it('takes the gate, roles and email from launch_status', async () => {
    launch({ mode: 'member', member_id: '00000000-0000-4000-9000-0000000000a1', email: 'ada@app.test', roles: ['member', 'staff'] });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(() => emitAuth('SIGNED_IN', fakeSession('ada@app.test')));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current).toMatchObject({ mode: 'member', isStaff: true, email: 'ada@app.test' });
    expect(supabase.rpc).toHaveBeenCalledWith('launch_status');
  });

  it('reports an error when the database cannot be reached', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'Network request failed' } });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(() => emitAuth('INITIAL_SESSION', fakeSession()));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('reads a name hint from the identity provider', async () => {
    launch({ mode: 'onboarding' });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(() => emitAuth('SIGNED_IN', fakeSession('g@app.test', { full_name: 'Gale Q Google' })));
    expect(result.current.nameHint).toEqual({ first: 'Gale', last: 'Q Google' });
    await act(() => emitAuth('SIGNED_IN', fakeSession('a@app.test', { given_name: 'Avery', family_name: 'Apple' })));
    expect(result.current.nameHint).toEqual({ first: 'Avery', last: 'Apple' });
  });

  it('is overridden by the dev-only __agent/session event, and {"real":true} removes it', async () => {
    registerAgentEffects({ setTheme: jest.fn(), setOnline: jest.fn(), refetch: jest.fn(), setSession: ({ real, ...p }) => setSessionOverride(real ? null : p) });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(() => emitAuth('INITIAL_SESSION', null));
    await act(() => {
      dispatchAgentEvent('session', { mode: 'terms', roles: ['member', 'admin'] });
    });
    expect(result.current).toMatchObject({ mode: 'terms', isStaff: true });
    await act(() => {
      dispatchAgentEvent('session', { real: true });
    });
    expect(result.current).toMatchObject({ mode: 'signed_out', isStaff: false });
    expect(dispatchAgentEvent('session', { mode: 'nope' })).toBe(false);
  });

  it('drops the override and the cache on sign out', async () => {
    setSessionOverride({ mode: 'member' });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(() => emitAuth('SIGNED_OUT', null));
    expect(result.current.mode).toBe('signed_out');
  });
});
