import { useStackTheme } from '@app/ui';
import { Stack } from 'expo-router';

/** The Items tab's native stack: the list (large title) and the detail it pushes, keeping the tab bar. */
export default function ItemsLayout() {
  const stack = useStackTheme();
  return (
    <Stack screenOptions={stack}>
      <Stack.Screen name="index" options={{ title: 'Items', headerLargeTitleEnabled: true }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  );
}
