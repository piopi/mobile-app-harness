import { useQuery } from '@tanstack/react-query';
import { env } from './env';

/** A cheap round trip to this worktree's Supabase stack: the current terms version, which anon may read. */
export function useBackendHealth() {
  return useQuery({
    queryKey: ['backend-health'],
    enabled: env.supabaseUrl !== '',
    queryFn: async () => {
      const res = await fetch(`${env.supabaseUrl}/rest/v1/terms_versions?select=version&is_current=eq.true`, {
        headers: { apikey: env.supabaseAnonKey, Authorization: `Bearer ${env.supabaseAnonKey}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = (await res.json()) as { version: string }[];
      return { termsVersion: rows[0]?.version ?? null };
    },
  });
}
