// Progress: a thin rail filled to the current step, with its caption ("1 / 2 · Your details").
// Announced as a progress bar with its step.
import * as React from 'react';
import { View } from 'react-native';
import { tv, type VariantProps } from '../../lib/utils';
import { Text } from './text';

const progressVariants = tv({
  slots: { rail: 'h-[4px] self-stretch overflow-hidden rounded-full', fill: 'h-full rounded-full' },
  variants: {
    tone: { default: { rail: 'bg-foreground/15', fill: 'bg-primary' }, 'on-ink': { rail: 'bg-on-ink/25', fill: 'bg-on-ink' } },
  },
  defaultVariants: { tone: 'default' },
});

type ProgressProps = VariantProps<typeof progressVariants> & {
  step: number;
  of: number;
  /** What this step is ("Your details"); shown after "1 / 2 ·". */
  label: string;
  testID?: string;
};

function Progress({ step, of, label, tone, testID }: ProgressProps) {
  const s = progressVariants({ tone });
  const pct = `${Math.round((Math.min(step, of) / of) * 100)}%` as const;
  return (
    <View className="gap-2" testID={testID}>
      <View
        className={s.rail()}
        role="progressbar"
        accessibilityLabel={`Step ${step} of ${of}: ${label.toLowerCase()}`}
        accessibilityValue={{ min: 1, max: of, now: step }}
      >
        <View className={s.fill()} style={{ width: pct }} />
      </View>
      <Text variant="kicker" tone={tone === 'on-ink' ? 'on-ink' : 'muted'} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {`${step} / ${of} · ${label}`}
      </Text>
    </View>
  );
}

export { Progress, progressVariants };
export type { ProgressProps };
