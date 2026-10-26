// Hairline divider. Separation is hairlines and surface shifts, never shadows.
import * as React from 'react';
import { View } from 'react-native';
import { tv, type VariantProps } from '../../lib/utils';
import { Text } from './text';

const dividerVariants = tv({
  base: 'h-px self-stretch',
  variants: {
    tone: { hairline: 'bg-hairline', strong: 'bg-foreground', 'on-ink': 'bg-on-ink/15' },
    inset: { none: '', gutter: 'mx-4' },
  },
  defaultVariants: { tone: 'hairline', inset: 'none' },
});

type DividerProps = VariantProps<typeof dividerVariants> & {
  /** A word in the middle of the rule ("or" between two ways to sign in). */
  label?: string;
};

function Divider({ label, ...props }: DividerProps) {
  if (!label) return <View className={dividerVariants(props)} />;
  return (
    <View className="flex-row items-center gap-3 self-stretch" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View className={`flex-1 ${dividerVariants(props)}`} />
      <Text variant="kicker" tone="muted">
        {label}
      </Text>
      <View className={`flex-1 ${dividerVariants(props)}`} />
    </View>
  );
}

export { Divider };
