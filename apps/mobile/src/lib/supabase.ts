import { createClient } from '@supabase/supabase-js';
import type { Database } from '@app/shared';
import { AppState } from 'react-native';
import { env } from './env';
import { secureStorage } from './secure-storage';

/**
 * The one Supabase client (Supabase's React Native setup): the session persists in the secure store, tokens
 * refresh only while the app is in the foreground, and the app never reads sessions from URLs (sign-in is a
 * code or a native ID token, never a redirect).
 */
export const supabase = createClient<Database>(env.supabaseUrl || 'http://127.0.0.1:1', env.supabaseAnonKey || 'missing-anon-key', {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});
