import type { OnboardingProfile } from '@app/shared';
import { useSyncExternalStore } from 'react';

/**
 * The onboarding answers while the member moves through the steps. Nothing is saved until "Finish setup", which
 * sends everything in one `complete_onboarding` call: the gate stays on onboarding until then, so the member is
 * never moved out mid-flow. Memory only: a relaunch starts the form again (the server keeps nothing half-done).
 */
export type OnboardingDraft = { profile: OnboardingProfile | null };

const EMPTY: OnboardingDraft = { profile: null };
let draft = EMPTY;
const listeners = new Set<() => void>();

export function setDraft(patch: Partial<OnboardingDraft>) {
  draft = { ...draft, ...patch };
  listeners.forEach((l) => l());
}

export function resetDraft() {
  setDraft(EMPTY);
}

export function useDraft(): OnboardingDraft {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => draft,
    () => draft,
  );
}
