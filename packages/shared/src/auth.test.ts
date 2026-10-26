import { describe, expect, it } from 'vitest';
import { profileProblems, formatCountdown, gateFor, normaliseOtp, otpCode, providerMode, resendSecondsLeft, signInEmail } from './auth';
import { launchMode } from './rpc';

describe('sign-in email', () => {
  it('trims and lower-cases', () => {
    expect(signInEmail.parse('  Jordan@App.Test ')).toBe('jordan@app.test');
  });
  it('refuses something that is not an email', () => {
    expect(signInEmail.safeParse('jordan').success).toBe(false);
  });
});

describe('one-time code', () => {
  it('keeps the digits of a pasted code', () => {
    expect(normaliseOtp('Code: 123 456')).toBe('123456');
    expect(normaliseOtp('1234567')).toBe('123456');
  });
  it('accepts exactly six digits', () => {
    expect(otpCode.safeParse('123456').success).toBe(true);
    expect(otpCode.safeParse('12345').success).toBe(false);
  });
  it('counts down to the resend', () => {
    expect(resendSecondsLeft(0, 10_000)).toBe(20);
    expect(resendSecondsLeft(0, 60_000)).toBe(0);
    expect(formatCountdown(28)).toBe('0:28');
  });
});

describe('onboarding profile', () => {
  it('passes a display name and names a missing one', () => {
    expect(profileProblems({ display_name: 'Jordan' })).toEqual({});
    expect(profileProblems({ display_name: ' ' })).toEqual({ display_name: 'missing' });
  });
});

describe('gates', () => {
  it('maps every launch mode to a gate', () => {
    expect(launchMode.options.map(gateFor)).toEqual(['sign-in', 'suspended', 'onboarding', 'terms', 'member']);
  });
});

describe('sign-in providers', () => {
  it('uses the real provider when configured on a supported platform', () => {
    expect(providerMode({ configured: true, platformSupported: true, dev: false })).toBe('native');
  });
  it('falls back to the local stand-in in development only', () => {
    expect(providerMode({ configured: false, platformSupported: true, dev: true })).toBe('stand-in');
    expect(providerMode({ configured: false, platformSupported: true, dev: false })).toBe('off');
  });
});
