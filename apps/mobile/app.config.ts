import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';
import harness from '../../harness.config.json';

// The app's identity comes from harness.config.json (one file per project; `pnpm harness:apply` writes the rest).
// Never put per-worktree values (slot, ports, URLs) in this file: the native fingerprint hashes the resolved
// config, and any difference stops worktrees from sharing native builds. Per-worktree values reach the app only
// through EXPO_PUBLIC_* variables in apps/mobile/.env.local (written by `pnpm wt up`).
//
// Per-environment values (docs/release.md) come from the EAS environment of the build profile (eas.json):
// development, preview (the staging backend) or production. EXPO_PUBLIC_* ones are inlined into the JS by Metro and
// read in src/lib/env.ts; the native ones are read here. Unset locally, so every worktree resolves the same config.
const { app, brand } = harness;

/** The store version users see. Changesets bumps it in package.json (the "Version packages" PR); never edit it here. */
const { version } = JSON.parse(readFileSync(path.join(__dirname, 'package.json'), 'utf8')) as { version: string };
/** The EAS project (`eas init`). Also a GitHub repository variable, so `eas` in CI finds the project. */
const easProjectId = process.env.EAS_PROJECT_ID;

// A store or preview build without a backend would ship an app that can't sign in: fail the EAS build instead.
if ((process.env.EAS_BUILD_PROFILE === 'production' || process.env.EAS_BUILD_PROFILE === 'preview') && !process.env.EXPO_PUBLIC_SUPABASE_URL) {
  throw new Error(`EXPO_PUBLIC_SUPABASE_URL is missing from the EAS "${process.env.EAS_BUILD_PROFILE}" environment (docs/release.md).`);
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: app.name,
  slug: app.slug,
  scheme: app.scheme,
  version,
  ...(process.env.EAS_OWNER ? { owner: process.env.EAS_OWNER } : {}),
  platforms: app.platforms as ExpoConfig['platforms'],
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: app.bundleId,
    supportsTablet: false,
    // Sign in with Apple entitlement (expo-apple-authentication).
    usesAppleSignIn: true,
    // Export compliance: only standard HTTPS/TLS, so TestFlight doesn't hold each build for the encryption question.
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: app.androidPackage ?? app.bundleId,
    adaptiveIcon: {
      backgroundColor: brand.light.primary,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    // Android 3-button navigation: no system scrim behind the buttons, so the tab bar's own ground runs to the
    // bottom edge exactly as it does under the gesture handle. Button colour follows the theme (<NavigationBar />).
    ['expo-navigation-bar', { enforceContrast: false }],
    ['expo-splash-screen', { backgroundColor: brand.dark.background, image: './assets/splash-icon.png', imageWidth: 120 }],
    // The Supabase session lives in the Keychain / Keystore. No biometrics, so no Face ID prompt string.
    ['expo-secure-store', { faceIDPermission: false }],
    'expo-apple-authentication',
    // Native Google sign-in without Firebase. The URL scheme is the reversed iOS client id, one value per app
    // (not per worktree): set GOOGLE_IOS_URL_SCHEME in the EAS environment. Locally the placeholder keeps one
    // shared fingerprint, and the app uses the dev stand-in because no Google client id is configured.
    [
      '@react-native-google-signin/google-signin',
      { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME ?? `com.googleusercontent.apps.${app.slug}-local-placeholder` },
    ],
    // OTA updates (docs/release.md): off until the EAS project exists (EAS_PROJECT_ID, see `updates` below).
    'expo-updates',
  ],
  // Read by src/lib/app.ts (the app's name in copy, the default appearance).
  extra: { defaultAppearance: brand.defaultAppearance, ...(easProjectId ? { eas: { projectId: easProjectId } } : {}) },
  // OTA updates: an update only reaches builds with the same native fingerprint (native modules, config plugins, this
  // file), so a JS update never lands on a binary that lacks a native change it needs. The release pipeline compares
  // fingerprints to choose between `eas update` and a store build. Off until EAS_PROJECT_ID is set; the build's channel
  // (eas.json) picks preview or production updates. The check runs at launch and never blocks it.
  runtimeVersion: { policy: 'fingerprint' },
  updates: {
    url: easProjectId ? `https://u.expo.dev/${easProjectId}` : undefined,
    enabled: Boolean(easProjectId),
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  },
  // Typed hrefs for router.push / <Link> (generated into .expo/types by `expo start`).
  experiments: { typedRoutes: true },
  // One native-build cache shared by every worktree on this machine (see the worktree skill). Its path differs on each
  // machine, so fingerprint.config.js leaves it out of the fingerprint (CI, EAS and every laptop must agree).
  // `expo run:ios|android` installs a cached build when the fingerprint matches instead of compiling.
  buildCacheProvider: {
    plugin: 'expo/local-build-cache-provider',
    options: { cacheDir: path.join(os.homedir(), `.${app.slug}`, 'build-cache') },
  },
});
