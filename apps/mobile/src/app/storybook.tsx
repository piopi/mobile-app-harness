import { Screen, Stack, Text } from '@app/ui';
import { useLocalSearchParams } from 'expo-router';
import type { ComponentType } from 'react';
import { env } from '../lib/env';

// One Storybook root per story id, built once and kept at module scope.
const roots = new Map<string, ComponentType>();

function storybookElement(story: string | undefined) {
  const key = story ?? '';
  let Root = roots.get(key);
  if (!Root) {
    // Required lazily: with the flag off, Metro swaps Storybook for empty modules.
    const { getStorybookUI } = require('../../.rnstorybook') as typeof import('../../.rnstorybook');
    Root = getStorybookUI(story);
    roots.set(key, Root);
  }
  return <Root key={key || 'catalog'} />;
}

function StorybookOff() {
  return (
    <Screen>
      <Stack gap="sm">
        <Text variant="h2">Storybook is off</Text>
        <Text variant="muted">Start Metro with EXPO_PUBLIC_STORYBOOK=true (pnpm wt up does this).</Text>
      </Stack>
    </Screen>
  );
}

/**
 * The on-device component catalog (Storybook RN 10, lite UI).
 * `/storybook` shows the catalog; `<scheme>://__storybook/<story-id>` lands here with `?story=` and renders
 * that one story full screen with no Storybook chrome, ready for a screenshot.
 */
export default function StorybookScreen() {
  const { story } = useLocalSearchParams<{ story?: string }>();
  if (!env.storybook) return <StorybookOff />;
  return storybookElement(story);
}
