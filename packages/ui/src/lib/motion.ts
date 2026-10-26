// Motion tokens: settling, never bouncing (PROJECT: tune to the brand). See the design-system skill.
import { Easing } from 'react-native-reanimated';

/** Durations in ms. One `proof` moment per flow; everything else is instant/quick/standard. */
export const duration = {
  instant: 120,
  quick: 200,
  standard: 320,
  reveal: 600,
  proof: 900,
  /** The fade-in background: slow enough to feel like lights coming up. */
  fade: 1100,
} as const;

/** The site's curves. `settle` for entering and settling, `sweep` for big screen-wide moves. */
export const easing = {
  settle: Easing.bezier(0.22, 1, 0.36, 1),
  sweep: Easing.bezier(0.785, 0.135, 0.15, 0.86),
  linear: Easing.linear,
} as const;

/** Stagger step between siblings in an entrance (ms). Cap the total at ~6 items. */
export const stagger = 70;

/** Press feedback: scale and opacity at full press. Interface 0.97, objects (a card that stands for a thing) 0.985. */
export const press = { scale: 0.97, objectScale: 0.985, opacity: 0.86 } as const;
