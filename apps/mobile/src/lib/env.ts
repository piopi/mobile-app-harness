/**
 * Per-worktree values, inlined by Metro from apps/mobile/.env.local (written by `pnpm wt up`), and per-environment
 * sign-in provider ids (set in the EAS environment for real builds; empty locally, so dev builds use stand-ins).
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  slot: process.env.EXPO_PUBLIC_WT_SLOT ?? '-',
  metroPort: process.env.EXPO_PUBLIC_METRO_PORT ?? '-',
  storybook: process.env.EXPO_PUBLIC_STORYBOOK === 'true',
  /** "true" once the Apple developer account has Sign in with Apple and Supabase's Apple provider is on. */
  appleSignIn: process.env.EXPO_PUBLIC_APPLE_SIGN_IN === 'true',
  /** Google OAuth client ids: the web one (Supabase verifies its tokens) and the iOS one. */
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  /**
   * The how-to guides site the Me tab's Help row opens; empty hides the row. Locally `pnpm guide serve --set-help-url`
   * writes it; a real build sets it in the EAS environment. A project that wants admins to change it moves it into
   * project data (how-to-guide skill, "Help in the app").
   */
  guidesUrl: process.env.EXPO_PUBLIC_GUIDES_URL ?? '',
};
