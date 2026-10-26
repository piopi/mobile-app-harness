import { useStackTheme } from '@app/ui';
import { Stack } from 'expo-router';

/** The Me tab's own native stack: its pushes keep the tab bar. Large title on iOS, Material top bar on Android. */
export default function MeLayout() {
  const stack = useStackTheme();
  return (
    <Stack screenOptions={stack}>
      <Stack.Screen name="index" options={{ title: 'Me', headerLargeTitleEnabled: true }} />
      <Stack.Screen name="dev" options={{ title: 'Dev panel' }} />
    </Stack>
  );
}
