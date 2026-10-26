// ListRow: the workhorse row. Hairline-separated, 64 pt min height. Leading slot (date block,
// avatar, thumbnail, index), title + subtitle, trailing slot (status, value, button, arrow).
import * as React from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { cn, tv, type VariantProps } from '../../lib/utils';
import { PressScale } from '../../motion/press-scale';
import { Icon } from './icon';
import { Text } from './text';

const listRowVariants = tv({
  slots: {
    root: 'min-h-16 flex-row items-center gap-4',
    body: 'flex-1 gap-0.5',
    title: '',
  },
  variants: {
    divider: { true: { root: 'border-hairline border-b' }, false: {} },
    density: { regular: { root: 'py-4' }, compact: { root: 'min-h-12 py-3' } },
    /** Muted, greyscale rows: the past, sold out, archived. */
    archived: { true: { root: 'opacity-55' }, false: {} },
    /** The viewer's own row in a shared list: a surface shift and a bold title, never colour alone. */
    highlight: { true: { root: 'bg-surface px-3', title: 'font-bold' }, false: {} },
  },
  defaultVariants: { divider: true, density: 'regular', archived: false, highlight: false },
});

type ListRowProps = VariantProps<typeof listRowVariants> & {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  /** A node (Badge, Button) or a mono value string. */
  trailing?: React.ReactNode;
  /** Show a trailing arrow (navigation rows). */
  arrow?: boolean;
  onPress?: () => void;
  testID?: string;
};

function ListRow({ title, subtitle, leading, trailing, arrow, onPress, testID, divider, density, archived, highlight }: ListRowProps) {
  const s = listRowVariants({ divider, density, archived, highlight });
  const content = (
    <>
      {leading}
      <View className={s.body()}>
        <Text variant="headline" numberOfLines={density === 'compact' ? 1 : 2} className={s.title()}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="callout" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {typeof trailing === 'string' ? <Text variant="label">{trailing}</Text> : trailing}
      {arrow ? <Icon name="caret-right" size={16} tone="muted" /> : null}
    </>
  );
  if (!onPress)
    return (
      <View className={s.root()} testID={testID}>
        {content}
      </View>
    );
  return (
    <PressScale className={s.root()} onPress={onPress} role="button" accessibilityLabel={title} testID={testID}>
      {content}
    </PressScale>
  );
}

/** Leading date block: "22 / OCT". */
function ListRowDate({ day, month }: { day: string | number; month: string }) {
  return (
    <View className="w-10 items-start">
      <Text variant="title-3" className="font-medium">
        {String(day)}
      </Text>
      <Text variant="micro" tone="muted">
        {month}
      </Text>
    </View>
  );
}

/** Leading index: "01". */
function ListRowIndex({ index }: { index: number }) {
  return (
    <View className="w-8">
      <Text variant="data" tone="muted">
        {String(index).padStart(2, '0')}
      </Text>
    </View>
  );
}

/**
 * Leading photo thumbnail. Photos are objects, so they keep the object radius. Without a photo, an empty tile
 * on the surface.
 */
function ListRowThumb({ source, archived }: { source?: ImageSourcePropType | null; archived?: boolean }) {
  if (!source)
    return (
      <View className={cn('bg-surface h-16 w-16 items-center justify-center rounded-object', archived && 'opacity-60')} accessibilityElementsHidden />
    );
  return (
    <Image
      source={source}
      className={cn('h-16 w-16 rounded-object bg-surface', archived && 'opacity-60')}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  );
}

export { ListRow, ListRowDate, ListRowIndex, ListRowThumb };
export type { ListRowProps };
