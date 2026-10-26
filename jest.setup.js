// Uniwind compiles className at bundle time; under Jest className is passed through untouched.
jest.mock('uniwind', () => ({
  withUniwind: (Component) => Component,
  Uniwind: { setTheme: jest.fn() },
  useUniwind: () => ({ theme: 'light', hasAdaptiveThemes: false }),
  useCSSVariable: (name) => (Array.isArray(name) ? name.map(() => '#000000') : '#000000'),
  ScopedTheme: ({ children }) => children,
}));

// Reanimated 4.7's own Jest mock fails to load under jest-expo (it boots JSReanimated, which throws on
// setCSSEventHandler). This minimal stand-in covers what packages/ui uses: animations jump to their end value.
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const builder = () => {
    const b = new Proxy({}, { get: (_t, key) => (key === 'build' ? () => () => ({}) : () => b) });
    return b;
  };
  const Easing = { bezier: () => (t) => t, linear: (t) => t, out: (f) => f, in: (f) => f, inOut: (f) => f };
  const Animated = { View: RN.View, Text: RN.Text, Image: RN.Image, ScrollView: RN.ScrollView, createAnimatedComponent: (c) => c };
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    Easing,
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    SensorType: { ROTATION: 5, GRAVITY: 3 },
    useSharedValue: (v) => ({ value: v }),
    useDerivedValue: (fn) => ({ value: fn() }),
    useAnimatedStyle: (fn) => fn(),
    useReducedMotion: () => false,
    useAnimatedSensor: () => ({ sensor: { value: { roll: 0, pitch: 0, yaw: 0 } } }),
    withTiming: (v) => v,
    withDelay: (_d, v) => v,
    withSpring: (v) => v,
    FadeIn: builder(),
    FadeInDown: builder(),
    FadeOutDown: builder(),
    FadeOut: builder(),
    SlideInDown: builder(),
    SlideOutDown: builder(),
  };
});


// The library's own mock: insets are zero, no provider needed.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
