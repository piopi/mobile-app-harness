// A full-bleed hero that fades up out of the ground and settles (scale 1.06 → 1), with scrims that melt its
// edges into the page so type can sit on it. A photo when there is one; without `source`, a wash of the brand
// colour. One per screen.
import * as React from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { duration, easing } from '../lib/motion';
import { AnimatedView } from './animated';
import { cn, tv, type VariantProps } from '../lib/utils';

const frame = tv({
  base: 'w-full overflow-hidden',
  variants: {
    height: {
      hero: 'h-[440px]',
      tall: 'h-[560px]',
      short: 'h-[300px]',
      screen: 'absolute inset-0 h-full',
    },
  },
  defaultVariants: { height: 'hero' },
});

/** Where the photo melts to. `background` follows the theme; `ink` is the night ground in both themes. */
const melt = tv({
  base: 'absolute inset-x-0 bottom-0 h-[62%] bg-linear-to-b',
  variants: {
    into: {
      background: 'from-background/0 via-background/70 to-background',
      ink: 'from-ink/0 via-ink/75 to-ink',
    },
  },
});

const topScrim = tv({
  base: 'absolute inset-x-0 top-0 h-[34%] bg-linear-to-b',
  variants: {
    into: { background: 'from-ink/60 to-ink/0', ink: 'from-ink/70 to-ink/0' },
  },
});

const ground = tv({ base: 'absolute inset-0', variants: { into: { background: 'bg-background', ink: 'bg-ink' } } });

type FadeInBackgroundProps = VariantProps<typeof frame> &
  VariantProps<typeof melt> & {
    /** The photo. Without one, the hero is a wash of the primary colour. */
    source?: ImageSourcePropType;
    /** Delay before the photo starts to come up (ms). */
    delay?: number;
    /** Dim the photo further for long text on top (0..1). */
    dim?: number;
    /** Render as a greyscale (archived content). */
    archive?: boolean;
    /** Skip the entrance (static screenshots, lists). */
    still?: boolean;
    children?: React.ReactNode;
    testID?: string;
  };

function FadeInBackground({
  source,
  height,
  into = 'background',
  delay = 0,
  dim = 0,
  archive = false,
  still = false,
  children,
  testID,
}: FadeInBackgroundProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(still ? 1 : 0);
  React.useEffect(() => {
    if (still) return;
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: reduced ? duration.quick : duration.fade,
        easing: easing.settle,
        reduceMotion: ReduceMotion.Never,
      }),
    );
  }, [delay, progress, reduced, still]);

  const photo = useAnimatedStyle(() => ({
    opacity: progress.value * (1 - dim),
    transform: [{ scale: reduced ? 1 : 1.06 - 0.06 * progress.value }],
  }));

  return (
    <View className={frame({ height })} testID={testID} pointerEvents="box-none">
      <View className={ground({ into })} />
      <AnimatedView className="absolute inset-0" style={photo}>
        {source ? (
          <Image source={source} resizeMode="cover" className={cn('h-full w-full', archive && 'grayscale')} accessibilityIgnoresInvertColors />
        ) : (
          <View className="from-primary to-accent h-full w-full bg-linear-to-br opacity-70" />
        )}
      </AnimatedView>
      <View className={topScrim({ into })} pointerEvents="none" />
      <View className={melt({ into })} pointerEvents="none" />
      {children ? (
        <View className="absolute inset-0" pointerEvents="box-none">
          {children}
        </View>
      ) : null}
    </View>
  );
}

export { FadeInBackground };
export type { FadeInBackgroundProps };
