import Constants from 'expo-constants';

/**
 * The app's identity at run time, from the Expo config (which reads harness.config.json). Copy that names the app
 * uses APP_NAME, never a literal, so a rename is one config change.
 */
export const APP_NAME = Constants.expoConfig?.name ?? 'App';
export const APP_SCHEME = (Array.isArray(Constants.expoConfig?.scheme) ? Constants.expoConfig.scheme[0] : Constants.expoConfig?.scheme) ?? 'app';

export type AppearanceChoice = 'system' | 'light' | 'dark';
const configured = (Constants.expoConfig?.extra as { defaultAppearance?: string } | undefined)?.defaultAppearance;
/** The appearance a fresh install starts in (harness.config.json brand.defaultAppearance). */
export const DEFAULT_APPEARANCE: AppearanceChoice = configured === 'light' || configured === 'system' ? configured : 'dark';
