import { z } from 'zod';
import { profileUpdate } from './schemas';
import type { LaunchStatus } from './rpc';

/** Sign-in and onboarding rules the screens share. The database re-checks everything that matters. */

/** An email address as the sign-in form takes it: trimmed and lower-cased. */
export const signInEmail = z.string().trim().toLowerCase().pipe(z.email());

/** The one-time code Supabase Auth emails (`[auth.email] otp_length`). */
export const OTP_LENGTH = 6;
export const otpCode = z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`));

/** Keep only digits, at most OTP_LENGTH of them (a pasted "123 456" or "Code: 123456" still works). */
export function normaliseOtp(input: string): string {
  return input.replace(/\D/g, '').slice(0, OTP_LENGTH);
}

/** How long before "Send a new code" is offered. Matches `[auth.email] max_frequency` in production. */
export const RESEND_AFTER_SECONDS = 30;

/** Whole seconds left before a new code may be sent (never negative). */
export function resendSecondsLeft(sentAtMs: number, nowMs: number, after = RESEND_AFTER_SECONDS): number {
  return Math.max(0, Math.ceil((sentAtMs + after * 1000 - nowMs) / 1000));
}

/** "0:28". */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Onboarding: the profile (the same rules as editing it later). */
export const onboardingProfile = profileUpdate;
export type OnboardingProfile = z.infer<typeof onboardingProfile>;
export type OnboardingProfileField = keyof OnboardingProfile;

/** The first problem with each field, or an empty object when the details are complete. */
export function profileProblems(input: Partial<Record<OnboardingProfileField, string>>): Partial<Record<OnboardingProfileField, 'missing' | 'invalid'>> {
  const out: Partial<Record<OnboardingProfileField, 'missing' | 'invalid'>> = {};
  const parsed = onboardingProfile.safeParse(input);
  if (parsed.success) return out;
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as OnboardingProfileField;
    if (out[field]) continue;
    out[field] = (input[field] ?? '').trim() === '' ? 'missing' : 'invalid';
  }
  return out;
}

/** The onboarding consents: the terms are required; marketing updates are optional. */
export const onboardingConsents = z.object({ terms: z.literal(true), marketing: z.boolean() });

/** Which gate the launch status opens. A held account (suspended) wins over everything else. */
export type Gate = 'sign-in' | 'onboarding' | 'terms' | 'suspended' | 'member';
export function gateFor(mode: LaunchStatus['mode']): Gate {
  switch (mode) {
    case 'signed_out':
      return 'sign-in';
    case 'onboarding':
      return 'onboarding';
    case 'terms':
      return 'terms';
    case 'suspended':
      return 'suspended';
    case 'member':
      return 'member';
  }
}

/** Sign-in providers and how each is reached in this build. */
export type ProviderMode = 'native' | 'stand-in' | 'off';
export function providerMode(opts: { configured: boolean; platformSupported: boolean; dev: boolean }): ProviderMode {
  if (opts.configured && opts.platformSupported) return 'native';
  if (opts.dev) return 'stand-in';
  return 'off';
}
