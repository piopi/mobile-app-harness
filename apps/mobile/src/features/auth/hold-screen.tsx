import type { IconName } from '@app/ui';
import { IconTile, Screen, Stack, Text } from '@app/ui';
import { useSession } from '../../lib/session';
import { HOLD } from './copy';
import { SignOutButton } from './sign-out-button';

/** An account hold: the mark, the title, the line, the contact email (app_settings) when set, and Sign out. */
export function HoldScreen({ kind, icon, testID }: { kind: 'suspended'; icon: IconName; testID: string }) {
  const { launch } = useSession();
  return (
    <Screen native testID={testID}>
      <Stack gap="lg">
        <IconTile icon={icon} size="lg" />
        <Stack gap="sm">
          <Text variant="title-2">{HOLD[kind].title}</Text>
          <Text variant="body" tone="muted">
            {HOLD[kind].body}
          </Text>
          {launch?.contact_email ? (
            <Text variant="callout" tone="muted" testID="hold-contact">
              {HOLD.contact(launch.contact_email)}
            </Text>
          ) : null}
        </Stack>
        <SignOutButton />
      </Stack>
    </Screen>
  );
}
