// Seeded from react-native-reusables (checkbox, @rn-primitives/checkbox), restyled: a box with a
// control-contrast edge, primary fill and a Phosphor check when ticked, and the label beside it. The whole row is
// the touch target (role checkbox, checked state announced). Consents (the terms, updates) use it.
import * as CheckboxPrimitive from '@rn-primitives/checkbox';
import * as React from 'react';
import { View } from 'react-native';
import { tv, type VariantProps } from '../../lib/utils';
import { Icon } from './icon';
import { Text } from './text';

const checkboxVariants = tv({
  slots: {
    root: 'min-h-11 flex-row items-start gap-3 py-1',
    box: 'mt-px size-6 items-center justify-center overflow-hidden rounded-sm border',
    indicator: 'bg-primary size-full items-center justify-center',
    body: 'flex-1 gap-1',
  },
  variants: {
    state: { default: { box: 'border-control' }, checked: { box: 'border-primary' }, error: { box: 'border-danger' } },
    disabled: { true: { root: 'opacity-50' }, false: {} },
  },
  defaultVariants: { state: 'default', disabled: false },
});

type CheckboxProps = Omit<VariantProps<typeof checkboxVariants>, 'state'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** What ticking it means, in the member's words ("I accept the terms."). */
  label: string;
  /** A muted line under the label. */
  description?: string;
  /** `strong` for a legal acceptance line (semi-bold label). */
  emphasis?: 'default' | 'strong';
  /** Show the edge in the error colour (a required box left empty on submit). */
  invalid?: boolean;
  testID?: string;
};

function Checkbox({ checked, onCheckedChange, label, description, emphasis = 'default', invalid, disabled, testID }: CheckboxProps) {
  const s = checkboxVariants({ state: invalid && !checked ? 'error' : checked ? 'checked' : 'default', disabled: !!disabled });
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={!!disabled}
      className={s.root()}
      accessibilityLabel={label}
      accessibilityHint={description}
      testID={testID}
    >
      <View className={s.box()}>
        <CheckboxPrimitive.Indicator className={s.indicator()}>
          <Icon name="check" size={16} tone="inverse" weight="bold" />
        </CheckboxPrimitive.Indicator>
      </View>
      <View className={s.body()}>
        <Text variant={emphasis === 'strong' ? 'headline' : 'body'}>{label}</Text>
        {description ? (
          <Text variant="callout" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox, checkboxVariants };
export type { CheckboxProps };
