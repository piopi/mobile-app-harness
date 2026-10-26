import { shortName } from '@app/shared';
import { ActionSheet, Avatar, Badge, ListRow, Screen, SectionHeader, Stack, Text } from '@app/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { useUniwind } from 'uniwind';
import { SignOutButton } from '../../../features/auth/sign-out-button';
import { ME } from '../../../features/me/copy';
import { setAppearance, type AppearanceChoice } from '../../../lib/appearance';
import { useSession } from '../../../lib/session';

/** Profile and settings: who is signed in, Appearance (System / Light / Dark), sign out, and the dev panel in dev builds. */
export default function Me() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const { launch, email, roles } = useSession();
  const appearance: AppearanceChoice = hasAdaptiveThemes ? 'system' : (theme as AppearanceChoice);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const name = shortName(launch?.first_name ?? null, null, email ?? ME.member);

  return (
    <Screen native testID="me-screen">
      <Stack direction="row" gap="md" align="center">
        <Avatar name={name} size="lg" />
        <Stack gap="xs" flex>
          <Text variant="title-3">{name}</Text>
          {email ? (
            <Text variant="callout" tone="muted">
              {email}
            </Text>
          ) : null}
          <Stack direction="row" gap="sm">
            {roles.filter((r) => r !== 'member').map((r) => (
              <Badge key={r} variant="solid" label={ME.role[r]} />
            ))}
          </Stack>
        </Stack>
      </Stack>

      <Stack gap="none">
        <SectionHeader title={ME.settings} size="sm" />
        <ListRow title={ME.appearance} trailing={ME.appearanceLabel[appearance]} onPress={() => setAppearanceOpen(true)} testID="me-appearance" />
        {__DEV__ ? <ListRow title={ME.devPanel} arrow onPress={() => router.push('/me/dev')} testID="me-dev" /> : null}
        <SignOutButton as="row" testID="me-sign-out" />
      </Stack>

      <ActionSheet
        open={appearanceOpen}
        onOpenChange={setAppearanceOpen}
        title={ME.appearance}
        message={ME.appearanceMessage}
        options={(['system', 'light', 'dark'] as const).map((v) => ({ value: v, label: ME.appearanceLabel[v], selected: v === appearance }))}
        onSelect={(v) => setAppearance(v)}
        testID="appearance-sheet"
      />
    </Screen>
  );
}
