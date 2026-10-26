// Badge / Status: a small tag. Status words come first; an icon (check, pending, dot) carries meaning
// with the word, never alone. Errors use danger.
import * as React from 'react';
import { View } from 'react-native';
import { tv, type VariantProps } from '../../lib/utils';
import { Icon, type IconName, type IconTone } from './icon';
import { Text } from './text';

const badgeVariants = tv({
  slots: {
    root: 'flex-row items-center gap-1.5 self-start rounded-sm',
    label: 'font-semibold text-[12px] leading-[16px]',
  },
  variants: {
    variant: {
      /** Surface chip. Counts, neutral tags ("5"). */
      neutral: { root: 'bg-surface px-2 py-1', label: 'text-foreground' },
      /** Primary chip. The current thing ("Staff", "New"). */
      solid: { root: 'bg-primary px-2 py-1', label: 'text-primary-foreground' },
      /** Hairline frame. */
      outline: { root: 'border-control border px-2 py-[3px]', label: 'text-foreground' },
      /** Bare status with an icon: Verified, Done. */
      verified: { root: 'px-0 py-1', label: 'text-foreground' },
      /** Bare status, muted: Pending, In review. */
      pending: { root: 'px-0 py-1', label: 'text-muted-foreground' },
      /** The brand accent ("Featured"). */
      accent: { root: 'bg-accent px-2 py-1', label: 'text-accent-foreground' },
      /** Errors ("Failed"). */
      danger: { root: 'bg-danger-soft px-2 py-1', label: 'text-danger' },
    },
  },
  defaultVariants: { variant: 'neutral' },
});

const ICON: Partial<Record<NonNullable<BadgeProps['variant']>, IconName>> = {
  verified: 'check',
  pending: 'pending',
  accent: 'dot',
};

const ICON_TONE: Record<NonNullable<BadgeProps['variant']>, IconTone> = {
  neutral: 'default',
  solid: 'inverse',
  outline: 'default',
  verified: 'default',
  pending: 'muted',
  accent: 'accent-foreground',
  danger: 'danger',
};

type BadgeProps = VariantProps<typeof badgeVariants> & {
  label: string;
  /** Override the variant's icon; pass null for none. */
  icon?: IconName | null;
  testID?: string;
};

function Badge({ variant = 'neutral', label, icon, testID }: BadgeProps) {
  const { root, label: labelClass } = badgeVariants({ variant });
  const name = icon === undefined ? ICON[variant!] : icon;
  return (
    <View className={root()} testID={testID} accessibilityLabel={label}>
      {name ? <Icon name={name} size={12} tone={ICON_TONE[variant!]} /> : null}
      <Text className={labelClass()}>{label}</Text>
    </View>
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
