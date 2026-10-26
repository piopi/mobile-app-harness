// SectionHeader: a section break. A title (or a kicker) with a meta or an action on the right
// ("Recent ··· See all →").
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { tv, type VariantProps } from '../../lib/utils';
import { Text } from './text';

const sectionHeaderVariants = tv({
  slots: {
    root: 'flex-row items-end justify-between gap-4',
  },
  variants: {
    size: {
      /** title-1. Page sections. */
      lg: { root: 'pb-1' },
      /** title-2. Sub-sections. */
      md: { root: '' },
      /** Kicker. Quiet groupings inside a card or list. */
      sm: { root: '' },
    },
    rule: { true: { root: 'border-foreground border-t pt-3' }, false: {} },
  },
  defaultVariants: { size: 'lg', rule: false },
});

type SectionHeaderProps = VariantProps<typeof sectionHeaderVariants> & {
  title: string;
  /** Mono meta on the right ("WEEK 8 OF 13"). */
  meta?: string;
  /** Action on the right; rendered as a mono link with an arrow. */
  action?: { label: string; onPress?: () => void };
  /** A small number before the title ("01"), for the numbered editorial grid. */
  index?: string;
};

function SectionHeader({ title, meta, action, index, size = 'lg', rule }: SectionHeaderProps) {
  const s = sectionHeaderVariants({ size, rule });
  const variant = size === 'lg' ? 'title-1' : size === 'md' ? 'title-2' : 'kicker';
  return (
    <View className={s.root()}>
      <View className="flex-1 flex-row items-baseline gap-3">
        {index ? (
          <Text variant="kicker" tone="muted">
            {index}
          </Text>
        ) : null}
        <Text variant={variant} numberOfLines={2} className="shrink">
          {title}
        </Text>
      </View>
      {action ? (
        <Pressable role="button" onPress={action.onPress} hitSlop={12} accessibilityLabel={action.label}>
          <Text variant="label" tone="primary">{`${action.label}  →`}</Text>
        </Pressable>
      ) : meta ? (
        <Text variant="kicker" tone="muted" className="pb-[3px]">
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

export { SectionHeader };
export type { SectionHeaderProps };
