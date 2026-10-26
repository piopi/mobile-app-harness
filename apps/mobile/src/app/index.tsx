import { gateFor } from '@app/shared';
import { Button, Screen, Stack, Text } from '@app/ui';
import { Redirect, type Href } from 'expo-router';
import { OFFLINE, TRY_AGAIN } from '../features/auth/copy';
import { useSession } from '../lib/session';

const FIRST_SCREEN = {
  'sign-in': '/welcome',
  onboarding: '/details',
  terms: '/terms',
  suspended: '/suspended',
  member: '/home',
} as const satisfies Record<ReturnType<typeof gateFor>, Href>;

/**
 * The anchor: never guarded, so it is where Expo Router lands when a gate closes under the user (sign out, a
 * suspension, onboarding done) and where `<scheme>://` opens. It sends each account state to its gate's first
 * screen. While the session loads the splash screen stays up; if the backend can't be reached, it says so.
 */
export default function Index() {
  const session = useSession();
  // First launch: the splash covers this. After a sign-in, a plain ground while the launch status loads.
  if (session.status === 'loading') return <Screen testID="launch-loading">{null}</Screen>;
  if (session.status === 'error')
    return (
      <Screen testID="launch-error">
        <Stack gap="md" flex justify="center">
          <Text variant="body">{OFFLINE}</Text>
          <Button block label={TRY_AGAIN} onPress={session.refetch} testID="launch-retry" />
        </Stack>
      </Screen>
    );
  return <Redirect href={FIRST_SCREEN[gateFor(session.mode)]} />;
}
