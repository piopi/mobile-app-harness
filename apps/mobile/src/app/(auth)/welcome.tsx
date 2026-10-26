import { Button, FadeInBackground, Screen, Stack, Text } from '@app/ui';
import { router } from 'expo-router';
import { LANDING } from '../../features/auth/copy';

/**
 * The landing: what the app is in one line, then Get started or sign in. PROJECT: the hero takes a photo
 * (`source`) once the brand has one; the copy lives in features/auth/copy.ts.
 */
export default function Welcome() {
  return (
    <Screen native padded={false} edges="none" testID="landing-screen">
      <Stack gap="lg">
        <FadeInBackground height="tall">
          <Stack flex justify="end" inset="gutter" gap="md">
            <Text variant="display">{LANDING.title}</Text>
            <Text variant="body" testID="landing-line">
              {LANDING.line}
            </Text>
          </Stack>
        </FadeInBackground>
        <Stack inset="gutter" gap="sm">
          <Button block label={LANDING.join} trailing="→" onPress={() => router.push('/sign-up')} testID="landing-join" />
          <Button variant="link" label={LANDING.signIn} onPress={() => router.push('/sign-in')} testID="landing-sign-in" />
        </Stack>
      </Stack>
    </Screen>
  );
}
