// Toast: a bar that settles up from the bottom edge. One line, a fact, optional action ("Saved").
// Errors use the danger tone and always come with an error haptic.
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { FadeIn, FadeOutDown, SlideInDown, useReducedMotion } from 'react-native-reanimated';
import { duration, easing } from '../../lib/motion';
import { tv, type VariantProps } from '../../lib/utils';
import { AnimatedView } from '../../motion/animated';
import { Icon } from './icon';
import { Text } from './text';

const toastVariants = tv({
  slots: {
    root: 'min-h-[52px] flex-row items-center gap-3 rounded-md px-4 py-3',
    message: 'font-sans-medium flex-1 text-[15px] leading-[20px]',
    action: 'font-sans-semibold text-[15px] underline',
  },
  variants: {
    tone: {
      default: { root: 'bg-foreground', message: 'text-background', action: 'text-background' },
      success: { root: 'bg-primary', message: 'text-primary-foreground', action: 'text-primary-foreground' },
      error: { root: 'bg-danger-soft', message: 'text-danger', action: 'text-danger' },
    },
  },
  defaultVariants: { tone: 'default' },
});

const ICON = { default: null, success: { name: 'check', tone: 'inverse' }, error: { name: 'alert', tone: 'danger' } } as const;

type ToastProps = VariantProps<typeof toastVariants> & {
  message: string;
  action?: { label: string; onPress?: () => void };
  /** Animate in (default). Off for static screenshots. */
  animated?: boolean;
  testID?: string;
};

function Toast({ message, action, tone = 'default', animated = true, testID }: ToastProps) {
  const s = toastVariants({ tone });
  const reduced = useReducedMotion();
  const icon = ICON[tone!];
  return (
    <AnimatedView
      testID={testID}
      entering={animated ? (reduced ? FadeIn.duration(duration.quick) : SlideInDown.duration(duration.standard).easing(easing.settle)) : undefined}
      exiting={animated ? FadeOutDown.duration(duration.quick) : undefined}
    >
      <View className={s.root()} role="alert" accessible accessibilityLiveRegion="polite">
        {icon ? <Icon name={icon.name} tone={icon.tone} size={14} /> : null}
        <Text className={s.message()}>{message}</Text>
        {action ? (
          <Pressable role="button" onPress={action.onPress} hitSlop={12}>
            <Text className={s.action()}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </AnimatedView>
  );
}

export { Toast };
export type { ToastProps };
