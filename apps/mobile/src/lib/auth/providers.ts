import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { providerMode, type ProviderMode } from '@app/shared';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { env } from '../env';
import { supabase } from '../supabase';

/**
 * Sign in with Apple and Google: native ID tokens handed to Supabase (`signInWithIdToken`), the flow Supabase
 * documents for Expo. Each provider is `native` once its ids are configured for this build, `stand-in` in a dev
 * build without them (a local account plays the provider, so the gates, Maestro and agents can drive it), and
 * `off` in a release build without them (the button is hidden).
 */
export type Provider = 'apple' | 'google';

/** Thrown when the member closes the provider's sheet: not an error to show. */
export class SignInCancelled extends Error {
  constructor() {
    super('cancelled');
  }
}

export const providerModes: Record<Provider, ProviderMode> = {
  // Apple's native sheet is iOS only. Android would need Apple's web flow; members there use Google or email.
  apple: providerMode({ configured: env.appleSignIn, platformSupported: Platform.OS === 'ios', dev: __DEV__ }),
  google: providerMode({ configured: env.googleWebClientId !== '', platformSupported: true, dev: __DEV__ }),
};

/** The local accounts the stand-ins sign in as. Apple shares a name only the first time, as the real one does. */
export const STAND_IN = {
  apple: { email: 'apple.member@app.test', given_name: 'Avery', family_name: 'Apple' },
  google: { email: 'google.member@app.test', given_name: 'Gale', family_name: 'Google' },
} as const;

let googleConfigured = false;

async function nativeApple() {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new SignInCancelled();
    throw e;
  }
  if (!credential.identityToken) throw new Error('Apple returned no identity token.');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
  if (error) throw error;
  // Apple shares the name once, on the first sign-in: keep it for the onboarding form.
  const { givenName, familyName } = credential.fullName ?? {};
  if (givenName || familyName) await supabase.auth.updateUser({ data: { given_name: givenName ?? undefined, family_name: familyName ?? undefined } });
}

async function nativeGoogle() {
  if (!googleConfigured) {
    GoogleSignin.configure({ webClientId: env.googleWebClientId, iosClientId: env.googleIosClientId || undefined });
    googleConfigured = true;
  }
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) throw new SignInCancelled();
  if (!response.data.idToken) throw new Error('Google returned no ID token.');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: response.data.idToken });
  if (error) throw error;
}

/** Dev builds only: a password sign-in (or sign-up, the first time) to this stack as the provider's local account. */
async function standIn(provider: Provider) {
  if (!__DEV__) throw new Error('Stand-ins exist only in development builds.');
  const who = STAND_IN[provider];
  const signedIn = await supabase.auth.signInWithPassword({ email: who.email, password: 'password123' });
  if (!signedIn.error) return;
  const { error } = await supabase.auth.signUp({
    email: who.email,
    password: 'password123',
    options: { data: { given_name: who.given_name, family_name: who.family_name, stand_in: provider } },
  });
  if (error) throw error;
}

export async function signInWith(provider: Provider) {
  const mode = providerModes[provider];
  if (mode === 'off') throw new Error(`${provider} sign-in is not configured.`);
  if (mode === 'stand-in') return standIn(provider);
  return provider === 'apple' ? nativeApple() : nativeGoogle();
}
