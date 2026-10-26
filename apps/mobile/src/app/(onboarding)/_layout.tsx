import { useStackTheme } from '@app/ui';
import { Stack } from 'expo-router';
import { SignOutButton } from '../../features/auth/sign-out-button';
import { APP_NAME } from '../../lib/app';
import { useSession } from '../../lib/session';

/**
 * First run (details, then the consents) and the terms re-accept. Sign out is always in the header: a person who
 * signed in with the wrong account can leave.
 */
export default function OnboardingLayout() {
  const stack = useStackTheme({ header: 'opaque' });
  const { mode } = useSession();
  const signOut = () => <SignOutButton as="link" testID="onboarding-sign-out" />;
  return (
    <Stack screenOptions={{ ...stack, title: APP_NAME, headerRight: signOut, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Protected guard={mode === 'onboarding'}>
        <Stack.Screen name="details" />
        <Stack.Screen name="consent" />
      </Stack.Protected>
      <Stack.Protected guard={mode === 'terms'}>
        <Stack.Screen name="terms" />
      </Stack.Protected>
    </Stack>
  );
}
