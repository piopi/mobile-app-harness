// Press feedback for anything tappable: settles down to a slightly smaller scale and back, on the UI thread.
// No spring overshoot (design-system: motion never bounces). Reduced motion keeps only the opacity change.
import * as React from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { withUniwind } from 'uniwind';
import { duration, easing, press } from '../lib/motion';

const AnimatedPressable = withUniwind(Animated.createAnimatedComponent(Pressable));

type PressScaleProps = React.ComponentProps<typeof Pressable> & {
  className?: string;
  /** `ui` for buttons and rows, `object` for physical objects (a card that stands for a thing). */
  weight?: 'ui' | 'object';
};

function PressScale({ weight = 'ui', onPressIn, onPressOut, style, ...props }: PressScaleProps) {
  const base = props.disabled ? 0.4 : 1;
  const pressed = useSharedValue(0);
  const reduced = useReducedMotion();
  const target = weight === 'object' ? press.objectScale : press.scale;
  const animated = useAnimatedStyle(() => ({
    opacity: base * (1 - pressed.value * (1 - press.opacity)),
    transform: [{ scale: reduced ? 1 : 1 - pressed.value * (1 - target) }],
  }));
  return (
    <AnimatedPressable
      onPressIn={(e) => {
        pressed.value = withTiming(1, { duration: duration.instant, easing: easing.settle });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withTiming(0, { duration: duration.quick, easing: easing.settle });
        onPressOut?.(e);
      }}
      style={[animated, style as object]}
      {...props}
    />
  );
}

export { PressScale };
export type { PressScaleProps };
