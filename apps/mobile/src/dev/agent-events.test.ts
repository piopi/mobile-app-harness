import { dispatchAgentEvent, getAgentState, handleAgentLink, parseAgentLink, registerAgentEffects, resetAgentStateForTests } from './agent-events';

const effects = () => {
  const e = { setTheme: jest.fn(), setOnline: jest.fn(), refetch: jest.fn() };
  registerAgentEffects(e);
  return e;
};

beforeEach(() => resetAgentStateForTests());

describe('agent links', () => {
  it('parses full URLs and bare paths with a JSON payload', () => {
    expect(parseAgentLink('acme://__agent/offline')).toEqual({ event: 'offline', payload: undefined });
    expect(parseAgentLink('/__agent/theme?payload=%7B%22theme%22%3A%22dark%22%7D')).toEqual({
      event: 'theme',
      payload: { theme: 'dark' },
    });
    expect(parseAgentLink('acme://items/12')).toBeNull();
  });

  it('is ignored in release builds', () => {
    const e = effects();
    expect(handleAgentLink('acme://__agent/offline', false)).toBe(false);
    expect(getAgentState().offline).toBe(false);
    expect(e.setOnline).not.toHaveBeenCalled();
  });

  it('flips offline and back in dev builds', () => {
    const e = effects();
    expect(handleAgentLink('acme://__agent/offline', true)).toBe(true);
    expect(getAgentState()).toMatchObject({ offline: true, lastEvent: 'offline' });
    expect(e.setOnline).toHaveBeenLastCalledWith(false);
    handleAgentLink('acme://__agent/online', true);
    expect(getAgentState().offline).toBe(false);
  });

  it('sets the theme through Uniwind', () => {
    const e = effects();
    expect(dispatchAgentEvent('theme', { theme: 'dark' })).toBe(true);
    expect(e.setTheme).toHaveBeenCalledWith('dark');
  });

  it('time travels to an instant', () => {
    effects();
    dispatchAgentEvent('time-travel', { iso: '2026-10-28T22:10:00Z' }, () => Date.parse('2026-10-28T20:10:00Z'));
    expect(getAgentState().clockOffsetMs).toBe(2 * 60 * 60_000);
  });

  it('rejects unknown events and bad payloads without changing state', () => {
    effects();
    expect(dispatchAgentEvent('sudo', {})).toBe(false);
    expect(dispatchAgentEvent('theme', { theme: 'neon' })).toBe(false);
    expect(getAgentState().lastEvent).toBeNull();
  });

  it('resets everything', () => {
    const e = effects();
    dispatchAgentEvent('offline', undefined);
    dispatchAgentEvent('reset', undefined);
    expect(getAgentState()).toMatchObject({ offline: false, theme: 'dark', lastEvent: 'reset' });
    expect(e.setOnline).toHaveBeenLastCalledWith(true);
  });
});

describe('sign-in agent events', () => {
  it('signs in to a seeded account and out again', () => {
    const e = { setTheme: jest.fn(), setOnline: jest.fn(), refetch: jest.fn(), signIn: jest.fn(), signOut: jest.fn() };
    registerAgentEffects(e);
    expect(handleAgentLink('acme://__agent/sign-in?payload=%7B%22email%22%3A%22ada%40app.test%22%7D', true)).toBe(true);
    expect(e.signIn).toHaveBeenCalledWith('ada@app.test', undefined);
    expect(dispatchAgentEvent('sign-in', { email: 'not-an-email' })).toBe(false);
    expect(dispatchAgentEvent('sign-out', undefined)).toBe(true);
    expect(e.signOut).toHaveBeenCalled();
  });
});
