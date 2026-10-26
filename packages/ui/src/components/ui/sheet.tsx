// Sheet: rounded top corners (rounded-sheet) on an elevated surface, with a grabber. Sheets are Expo Router routes (AGENTS.md): declare the route with
// `presentation: 'formSheet'`, `sheetGrabberVisible: true`, `sheetCornerRadius: 22` and `sheetAllowedDetents`,
// and render `<Sheet presentation="route">` as its content. The OS draws the corners, grabber, dimming and
// the drag; this component draws only the content rhythm. `"inline"` draws the whole object in place
// (stories, screenshots).
import * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tv, type VariantProps } from '../../lib/utils';
import { Text } from './text';

const sheetVariants = tv({
  slots: {
    panel: 'bg-surface-elevated rounded-t-sheet gap-5 px-4 pt-3',
    grabber: 'bg-foreground/20 h-[4px] w-9 self-center rounded-full',
  },
  variants: {
    ground: {
      default: {},
      /** Force the night look (a full-screen moment that reads dark in both themes). */
      ink: { panel: 'bg-ink', grabber: 'bg-on-ink/25' },
    },
    /** Inline: draw the rounded object. Route: the native sheet is the object; content only. */
    chrome: { true: {}, false: { panel: 'rounded-t-none bg-transparent pt-6' } },
  },
  defaultVariants: { ground: 'default', chrome: true },
});

type SheetProps = VariantProps<typeof sheetVariants> & {
  title?: string;
  kicker?: string;
  children?: React.ReactNode;
  /** `route`: content of a formSheet route (default). `inline`: the full object in place. */
  presentation?: 'route' | 'inline';
  testID?: string;
};

function SheetPanel({
  title,
  kicker,
  children,
  ground,
  bottomInset,
  chrome,
}: Pick<SheetProps, 'title' | 'kicker' | 'children' | 'ground'> & { bottomInset: number; chrome: boolean }) {
  const s = sheetVariants({ ground, chrome });
  return (
    <View className={s.panel()} style={{ paddingBottom: Math.max(bottomInset, 16) + 8 }}>
      {chrome ? <View className={s.grabber()} /> : null}
      {kicker || title ? (
        <View className="gap-1 pt-2">
          {kicker ? (
            <Text variant="kicker" tone={ground === 'ink' ? 'on-ink' : 'muted'}>
              {kicker}
            </Text>
          ) : null}
          {title ? (
            <Text variant="title-2" tone={ground === 'ink' ? 'on-ink' : undefined}>
              {title}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

function Sheet({ presentation = 'route', testID, ...panel }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <View testID={testID}>
      <SheetPanel {...panel} bottomInset={insets.bottom} chrome={presentation === 'inline'} />
    </View>
  );
}

export { Sheet };
export type { SheetProps };
