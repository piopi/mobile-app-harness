import { useStackTheme } from '@app/ui';
import { Stack } from 'expo-router';

/** Home's native stack. The root screen has no header: its hero runs under the status bar. */
export default function HomeLayout() {
  const stack = useStackTheme();
  return (
    <Stack screenOptions={stack}>
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Home' }} />
    </Stack>
  );
}
