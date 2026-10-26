import { rpcErrorCode } from '@app/shared';
import { APP_NAME } from '../../lib/app';

/**
 * Every sentence the sign-in, onboarding and account-gate screens show. PROJECT: rewrite these in the brand's
 * voice (or port them word for word from the reference app). Anything that names a place, a time, a count or a
 * rule comes from data (an RPC), never from here.
 */

export const LANDING = {
  title: `Welcome to ${APP_NAME}.`,
  line: 'One line on what the app does for the person holding the phone.',
  join: 'Get started',
  signIn: 'I already have an account',
  adults: 'You must be 18 or older to use this app.',
} as const;

export const AUTH_HERO = {
  'sign-in': { title: 'Welcome back.', line: `Sign in to your ${APP_NAME} account.` },
  'sign-up': { title: 'Create your account.', line: 'Continue with Apple, Google or your email.' },
} as const;
export type AuthMode = keyof typeof AUTH_HERO;

export const AUTH_FORM = {
  google: 'Continue with Google',
  googlePending: 'Opening Google…',
  apple: 'Continue with Apple',
  applePending: 'Opening Apple…',
  or: 'or',
  emailLabel: 'Email',
  emailHint: 'We’ll email you a 6-digit code. No password needed.',
  sendCode: 'Email me a code',
  sending: 'Sending…',
  invalidEmail: 'Enter a valid email address.',
  checkEmail: 'Check your email',
  sent: (email: string) => `We sent a 6-digit code to ${email}. It expires in 10 minutes.`,
  limit: (email: string) => `We can’t send another code to ${email} right now. Use the last code we sent.`,
  codeLabel: '6-digit code',
  codeLength: 'Enter the 6-digit code from the email.',
  checking: 'Checking…',
  submit: { 'sign-in': 'Sign in', 'sign-up': 'Create account' },
  newCodeIn: 'New code in',
  sendNewCode: 'Send a new code',
  differentEmail: 'Use a different email',
  switchPrompt: { 'sign-in': 'New here?', 'sign-up': 'Already have an account?' },
  switchLink: { 'sign-in': 'Create an account', 'sign-up': 'Sign in' },
} as const;

export const PROVIDER_ERROR = {
  google: 'Google sign-in didn’t finish. Try again, or use your email.',
  apple: 'Apple sign-in didn’t finish. Try again, or use your email.',
} as const;

// Keyed by what Supabase Auth returns.
const AUTH_MESSAGES: Record<string, string> = {
  otp_expired: 'That code isn’t right. Check the email and try again.',
  email_address_invalid: 'Enter a valid email address.',
  validation_failed: 'Enter a valid email address.',
  email_provider_disabled: 'Sign-in by email is unavailable right now. Try again later.',
  signup_disabled: 'Sign-in isn’t available right now. Try again later.',
  over_email_send_rate_limit: 'Too many tries for this email. Try again later.',
  over_request_rate_limit: 'Too many tries. Wait a few minutes, then try again.',
};
export const OFFLINE = 'You seem to be offline. Check your connection and try again.';
export const SOMETHING_WRONG = 'Something went wrong. Try again in a moment.';
export const TRY_AGAIN = 'Try again';

export function authErrorCopy(error: unknown): string {
  const e = error as { code?: string; status?: number; name?: string; message?: string } | null;
  if (e?.code && AUTH_MESSAGES[e.code]) return AUTH_MESSAGES[e.code]!;
  if (e?.status === 429) return AUTH_MESSAGES.over_request_rate_limit!;
  if (e?.name === 'AuthRetryableFetchError' || /network request failed|fetch/i.test(e?.message ?? '')) return OFFLINE;
  return SOMETHING_WRONG;
}

/** Email codes refused for this address right now: still move to the code step (earlier codes may be in the inbox). */
export function isEmailLimit(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'over_email_send_rate_limit';
}

export const ONBOARDING = {
  detailsTitle: 'About you.',
  consentTitle: 'Before you start.',
  detailsStep: 'Your details',
  consentStep: 'Terms',
  signedInAs: (email: string) => `Signed in as ${email}`,
  firstName: 'First name',
  lastName: 'Last name',
  continue: 'Continue',
  adult: 'I am 18 or older.',
  adultDetail: 'Your confirmation is stored with your account.',
  termsTitle: (v: string) => `Terms of use, version ${v}`,
  termsIntro: 'Read the terms before you accept them.',
  openLarger: 'Read the full text',
  marketing: 'Send me product updates.',
  marketingDetail: 'Optional. Unsubscribe at any time.',
  saveFailed: 'We could not save your details. Try again.',
  finish: 'Finish setup',
} as const;

export const TERMS = {
  acceptButton: 'Accept and continue',
  close: 'Close',
  reacceptTitle: 'The terms have a new version.',
  reacceptLede: (v: string) => `Read version ${v} and accept it to keep using ${APP_NAME}. Your account stays as it is.`,
  whatChanged: 'What changed',
  saving: 'Saving…',
  saveFailed: 'Your acceptance couldn’t be saved. Try again.',
  saveOffline: 'Your acceptance couldn’t be saved. Check your connection and try again.',
} as const;

export const HOLD = {
  suspended: { title: 'This account isn’t active.', body: 'Your account has been paused. Contact us if you think this is a mistake.' },
  contact: (email: string) => `Contact: ${email}`,
  signOut: 'Sign out',
  confirmTitle: 'Sign out?',
  confirmBody: 'Your account stays as it is. Sign back in with your email.',
  stay: 'Stay signed in',
} as const;

export function rpcSaveError(error: unknown, fallback: string, offline?: string): string {
  const e = error as { message?: string; name?: string } | null;
  if (offline && (e?.name === 'TypeError' || /network request failed|fetch/i.test(e?.message ?? '')) && !rpcErrorCode(e)) return offline;
  return fallback;
}
