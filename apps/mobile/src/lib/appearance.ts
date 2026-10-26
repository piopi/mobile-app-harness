import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Uniwind } from 'uniwind';
import { DEFAULT_APPEARANCE, type AppearanceChoice } from './app';

/**
 * The app starts in the configured default (harness.config.json brand.defaultAppearance); Me → Appearance offers
 * System, Light and Dark and remembers the choice on this device. Uniwind.setTheme also sets React Native's
 * Appearance, so the native chrome (status bar, headers, tabs, Android navigation bar) follows.
 */
export type { AppearanceChoice };
export { DEFAULT_APPEARANCE };
const KEY = 'appearance';
const CHOICES: readonly AppearanceChoice[] = ['system', 'light', 'dark'];

let ready = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** At start-up, before the first frame: the default at once, then the stored choice (the splash covers it). */
export function initAppearance() {
  Uniwind.setTheme(DEFAULT_APPEARANCE);
  SecureStore.getItemAsync(KEY)
    .then((stored) => {
      if (stored && (CHOICES as readonly string[]).includes(stored) && stored !== DEFAULT_APPEARANCE) Uniwind.setTheme(stored as AppearanceChoice);
    })
    .catch(() => {})
    .finally(() => {
      ready = true;
      notify();
    });
}

/** The choice in Me → Appearance, kept for the next launch. */
export function setAppearance(choice: AppearanceChoice) {
  Uniwind.setTheme(choice);
  void SecureStore.setItemAsync(KEY, choice).catch(() => {});
}

/** True once the stored choice is applied (the root keeps the splash up until then). */
export function useAppearanceReady(): boolean {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => ready,
    () => ready,
  );
}
