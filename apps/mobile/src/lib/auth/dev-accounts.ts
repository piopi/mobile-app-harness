import { supabase } from '../supabase';

/**
 * Dev builds: the seeded accounts (supabase/seed.sql and the scenarios), one tap or one agent link away.
 * Every one signs in with password123 against this worktree's stack. Never shown in a release build.
 * A new scenario with its own account adds a row here.
 */
export const DEV_ACCOUNTS = [
  { email: 'ada@app.test', who: 'Member' },
  { email: 'staff@app.test', who: 'Staff' },
  { email: 'admin@app.test', who: 'Admin' },
  { email: 'olly@app.test', who: 'Onboarding (scenario onboarding)' },
  { email: 'sid@app.test', who: 'Suspended (scenario suspended)' },
] as const;

export async function devSignIn(email: string, password = 'password123') {
  if (!__DEV__) return;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
