// Wraps the whole app: gesture root + themed background + the bundled fonts + the portal host for dialogs. The only place the root view
// is styled. Children render once the fonts are ready (the splash screen covers the wait).
import { PortalHost } from '@rn-primitives/portal';
import { useFonts } from 'expo-font';
import * as React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { withUniwind } from 'uniwind';
import { fontAssets } from '../../lib/fonts';

const StyledGestureRoot = withUniwind(GestureHandlerRootView);

function AppRoot({ children }: { children: React.ReactNode }) {
  const [loaded, error] = useFonts(fontAssets);
  return (
    <StyledGestureRoot className="flex-1 bg-background">
      {loaded || error ? children : null}
      {/* Where AlertDialog and ActionSheet render, above every screen. */}
      <PortalHost />
    </StyledGestureRoot>
  );
}

export { AppRoot };
