import '../global.css';
import { Button, useNavigationColors, useStackTheme } from '@app/ui';
import { router, Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { setLastPathname } from '../dev/last-pathname';
import { TERMS } from '../features/auth/copy';
import { APP_NAME } from '../lib/app';
import { useAppearanceReady } from '../lib/appearance';
import { useSession } from '../lib/session';
import { Providers } from '../providers';

// The splash covers the wait for the stored session and the launch status (index.tsx renders nothing until then).
void SplashScreen.preventAutoHideAsync();

/**
 * The root: providers, then one native Stack whose screens are gated by the account state. Exactly one gate is
 * open at a time (`launch_status().mode`, see src/lib/session.ts); Expo Router sends the user to the first screen
 * they may see. A new account state is a new `Stack.Protected` gate here and a new mode in launch_status().
 */
function RootStack() {
  const scheme = useColorScheme();
  const colors = useNavigationColors();
  const stack = useStackTheme();
  const session = useSession();
  const ready = session.status !== 'loading';
  const themed = useAppearanceReady();
  useEffect(() => {
    if (ready && themed) void SplashScreen.hideAsync();
  }, [ready, themed]);
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  // Until the session is known, every gate stays shut and the anchor (index) waits under the splash.
  const open = (mode: typeof session.mode) => ready && session.mode === mode;
  // Holds: the app name in a native header, nothing to go back to.
  const hold = { headerShown: true, title: APP_NAME, headerBackVisible: false };
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, ...colors } }}>
      <StatusBar style="auto" />
      <NavigationBar style="auto" />
      <Stack screenOptions={{ ...stack, headerShown: false }}>
        {/* The anchor: unguarded, redirects to whichever gate is open (app/index.tsx). */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Protected guard={open('signed_out')}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        {/* PROJECT: a new onboarding step is a screen in (onboarding); a step the app can't open without is also
            a check in launch_status() (the db-change skill, "Add an onboarding field or step"). */}
        <Stack.Protected guard={open('onboarding') || open('terms')}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={open('suspended')}>
          <Stack.Screen name="suspended" options={hold} />
        </Stack.Protected>
        <Stack.Protected guard={open('member')}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        {/* The full terms, over onboarding or the re-accept gate. */}
        <Stack.Protected guard={open('onboarding') || open('terms')}>
          <Stack.Screen
            name="terms-text"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: '',
              headerRight: () => <Button variant="link" size="header" icon="close" label={TERMS.close} onPress={() => router.back()} testID="close-terms-text" />,
            }}
          />
        </Stack.Protected>
        <Stack.Screen name="storybook" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  // With its query: an agent link sends the app back to this exact route, params included.
  const query = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : v === undefined ? [] : [[k, v]])),
  ).toString();
  const href = query ? `${pathname}?${query}` : pathname;
  useEffect(() => setLastPathname(href), [href]);
  return (
    <Providers>
      <RootStack />
    </Providers>
  );
}
