import os from 'node:os';
import path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';
import harness from '../../harness.config.json';

// The app's identity comes from harness.config.json (one file per project; `pnpm harness:apply` writes the rest).
// Never put per-worktree values (slot, ports, URLs) in this file: the native fingerprint hashes the resolved
// config, and any difference stops worktrees from sharing native builds. Per-worktree values reach the app only
// through EXPO_PUBLIC_* variables in apps/mobile/.env.local (written by `pnpm wt up`).
const { app, brand } = harness;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: app.name,
  slug: app.slug,
  scheme: app.scheme,
  version: '0.1.0',
  platforms: app.platforms as ExpoConfig['platforms'],
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: app.bundleId,
    supportsTablet: false,
    // Sign in with Apple entitlement (expo-apple-authentication).
    usesAppleSignIn: true,
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
  ],
  // Read by src/lib/app.ts (the app's name in copy, the default appearance).
  extra: { defaultAppearance: brand.defaultAppearance },
  // Typed hrefs for router.push / <Link> (generated into .expo/types by `expo start`).
  experiments: { typedRoutes: true },
  // One native-build cache shared by every worktree on this machine (see the worktree skill).
  // `expo run:ios|android` installs a cached build when the fingerprint matches instead of compiling.
  buildCacheProvider: {
    plugin: 'expo/local-build-cache-provider',
    options: { cacheDir: path.join(os.homedir(), `.${app.slug}`, 'build-cache') },
  },
});
