// The root of every screen: themed background, safe areas, standard gutter, optional scroll and footer.
// `edges="bottom"` lets a FadeInBackground hero run under the status bar.
// `native`: the screen sits inside native chrome (a native Stack header and/or NativeTabs). The scroll view is
// then the root, so iOS insets it under the header and the tab bar itself (`contentInsetAdjustmentBehavior`)
// and NativeTabs pads Android's bottom; no SafeAreaView of our own. With `edges="none"` (a hero under the status
// bar, header hidden) the iOS top inset is cancelled so the photo runs to the top edge.
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';
import { tv, type VariantProps } from '../../lib/utils';

const StyledSafeAreaView = withUniwind(SafeAreaView);

const screenVariants = tv({
  base: 'flex-1',
  variants: {
    padded: { true: 'px-4 py-6', false: '' },
    ground: { background: 'bg-background', ink: 'bg-ink' },
  },
  defaultVariants: { padded: true, ground: 'background' },
});

const EDGES: Record<'all' | 'top' | 'bottom' | 'none', Edge[]> = {
  all: ['top', 'bottom', 'left', 'right'],
  top: ['top', 'left', 'right'],
  bottom: ['bottom', 'left', 'right'],
  none: [],
};

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  testID?: string;
  /** Safe-area edges to pad. Use `none` with a hero that runs under the status bar. */
  edges?: keyof typeof EDGES;
  /** Pinned below the content (a primary action). */
  footer?: React.ReactNode;
  /** Inside a native Stack header and/or NativeTabs: the OS owns the insets. Implies `scroll`. */
  native?: boolean;
} & VariantProps<typeof screenVariants>;

function NativeScreen({ children, padded, ground, testID, edges }: Omit<ScreenProps, 'native' | 'scroll' | 'footer'>) {
  const insets = useSafeAreaInsets();
  const underStatusBar = edges === 'none' && process.env.EXPO_OS === 'ios';
  return (
    <ScrollView
      className={screenVariants({ padded, ground })}
      contentContainerClassName={padded === false ? 'pb-10' : 'gap-6 pb-10'}
      contentContainerStyle={underStatusBar ? { marginTop: -insets.top } : undefined}
      contentInsetAdjustmentBehavior="automatic"
      // The OS keyboard handling: iOS insets the scroll view by the keyboard frame; Android resizes the window
      // (adjustResize, Expo's default). Taps on controls land while the keyboard is up.
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      testID={testID}
    >
      {children}
    </ScrollView>
  );
}

function Screen({ children, scroll = false, padded, ground, testID, edges = 'all', footer, native }: ScreenProps) {
  if (native) return <NativeScreen padded={padded} ground={ground} testID={testID} edges={edges}>{children}</NativeScreen>;
  const inner = scroll ? (
    <ScrollView
      className={screenVariants({ padded, ground })}
      contentContainerClassName={padded === false ? 'pb-10' : 'gap-6 pb-10'}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={screenVariants({ padded, ground })}>{children}</View>
  );
  return (
    <StyledSafeAreaView
      className={screenVariants({ padded: false, ground })}
      edges={footer ? EDGES[edges].filter((e) => e !== 'bottom') : EDGES[edges]}
      testID={testID}
    >
      {inner}
      {footer}
    </StyledSafeAreaView>
  );
}

export { Screen };
export type { ScreenProps };
