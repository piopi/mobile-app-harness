import { useStackTheme } from '@app/ui';
import { Stack } from 'expo-router';
import { APP_NAME } from '../../lib/app';

/** The gate has no index: open on the landing when the root guard sends a signed-out person here. */
export const unstable_settings = { anchor: 'welcome' };

/**
 * Signed out: the landing, sign-in, sign-up and the code step. The landing runs its hero under the status bar;
 * the others carry the app name in an opaque native header (forms: see useStackTheme).
 */
export default function AuthLayout() {
  const stack = useStackTheme({ header: 'opaque' });
  return (
    <Stack screenOptions={{ ...stack, title: APP_NAME, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
