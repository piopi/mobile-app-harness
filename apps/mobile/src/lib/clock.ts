import { useEffect, useState } from 'react';
import { getAgentState, useAgentState } from '../dev/agent-events';

/** The app's notion of "now". Agents shift it with `__agent/time-travel` in dev builds; always real in release. */
export function now(): Date {
  return new Date(Date.now() + (__DEV__ ? getAgentState().clockOffsetMs : 0));
}

/** "Now" for components, refreshed every 30 s and whenever an agent time-travels. */
export function useNow(): Date {
  const { clockOffsetMs } = useAgentState();
  const [real, setReal] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setReal(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return new Date(real + (__DEV__ ? clockOffsetMs : 0));
}
