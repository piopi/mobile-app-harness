import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { PortalHost } from '@rn-primitives/portal';
import type { ReactElement } from 'react';

/** Render with a fresh query client (no retries) and the portal host dialogs render into. */
export function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(
    <QueryClientProvider client={client}>
      {ui}
      <PortalHost />
    </QueryClientProvider>,
  );
}
