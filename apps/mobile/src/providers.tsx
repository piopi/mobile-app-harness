import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { AppRoot } from '@app/ui';
import * as React from 'react';
import { Uniwind } from 'uniwind';
import { registerAgentEffects } from './dev/agent-events';
import { initAppearance } from './lib/appearance';
import { devSignIn } from './lib/auth/dev-accounts';
import { queryClient } from './lib/query-client';
import { setSessionOverride, signOut } from './lib/session';

export { queryClient };

// Dark by default, then the member's stored Appearance choice.
initAppearance();

if (__DEV__) {
  registerAgentEffects({
    setTheme: (theme) => Uniwind.setTheme(theme),
    setOnline: (online) => onlineManager.setOnline(online),
    refetch: () => void queryClient.invalidateQueries(),
    setSession: ({ real, ...patch }) => setSessionOverride(real ? null : patch),
    signIn: (email, password) => {
      setSessionOverride(null);
      devSignIn(email, password).catch((e: unknown) => console.warn('[agent] sign-in failed', e));
    },
    signOut: () => void signOut(),
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoot>{children}</AppRoot>
    </QueryClientProvider>
  );
}
