// FilterChips: one choice out of a few, as a row of chips (All / Published / Drafts). The chosen chip is filled
// with `primary`; the others carry a `control` edge. A select haptic on change. Announced as a radio group.
// PROJECT: if the brand is happy with the system look, the native segmented control (expo-ui) is the official
// alternative; this exists because the system control can't carry custom type.
import * as React from 'react';
import { View } from 'react-native';
import { haptics } from '../../lib/haptics';
import { tv, type VariantProps } from '../../lib/utils';
import { PressScale } from '../../motion/press-scale';
import { Text } from './text';

const filterChipsVariants = tv({
  slots: {
    root: 'flex-row flex-wrap gap-2',
    chip: 'h-11 items-center justify-center rounded-full px-4',
    label: 'font-medium text-[15px] leading-[20px]',
  },
  variants: {
    selected: {
      true: { chip: 'bg-primary', label: 'text-primary-foreground' },
      false: { chip: 'border-control border bg-transparent', label: 'text-foreground' },
    },
  },
  defaultVariants: { selected: false },
});

type FilterOption<T extends string> = { value: T; label: string; testID?: string };

type FilterChipsProps<T extends string> = Omit<VariantProps<typeof filterChipsVariants>, 'selected'> & {
  options: readonly FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** What the group filters ("Filter items"), for screen readers. */
  label: string;
  testID?: string;
};

function FilterChips<T extends string>({ options, value, onChange, label, testID }: FilterChipsProps<T>) {
  return (
    <View className={filterChipsVariants().root()} role="radiogroup" accessibilityLabel={label} testID={testID}>
      {options.map((o) => {
        const selected = o.value === value;
        const s = filterChipsVariants({ selected });
        return (
          <PressScale
            key={o.value}
            className={s.chip()}
            role="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ selected, checked: selected }}
            testID={o.testID}
            onPress={() => {
              if (selected) return;
              haptics.select();
              onChange(o.value);
            }}
          >
            <Text className={s.label()}>{o.label}</Text>
          </PressScale>
        );
      })}
    </View>
  );
}

export { FilterChips, filterChipsVariants };
export type { FilterChipsProps, FilterOption };
