// Staggered entrance: children rise 14 pt and fade in one after another, settling (no bounce).
// Wrap the top-level blocks of a screen, not every row. Reduced motion: a plain quick fade.
import * as React from 'react';
import { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { duration, easing, stagger as step } from '../lib/motion';
import { AnimatedView } from './animated';

type StaggerProps = {
  children: React.ReactNode;
  /** Delay before the first child (ms), e.g. to wait for a FadeInBackground. */
  delay?: number;
  /** Step between children (ms). */
  step?: number;
  /** Gap between children, matches Stack. */
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
};

const GAP = { none: 'gap-0', sm: 'gap-2', md: 'gap-4', lg: 'gap-6', xl: 'gap-10' } as const;

function Stagger({ children, delay = 0, step: stepMs = step, gap = 'none' }: StaggerProps) {
  const reduced = useReducedMotion();
  const items = React.Children.toArray(children);
  return (
    <AnimatedView className={`flex-col ${GAP[gap]}`}>
      {items.map((child, i) => (
        <AnimatedView
          key={(child as React.ReactElement).key ?? i}
          entering={
            reduced
              ? FadeIn.duration(duration.quick)
              : FadeInDown.withInitialValues({ transform: [{ translateY: 14 }] })
                  .duration(duration.reveal)
                  .delay(delay + i * stepMs)
                  .easing(easing.settle)
          }
        >
          {child}
        </AnimatedView>
      ))}
    </AnimatedView>
  );
}

export { Stagger };
