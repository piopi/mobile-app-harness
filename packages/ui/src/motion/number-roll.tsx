// Numbers roll, not pop: a count ticks from `from` to `to` with tabular figures so the width never jitters.
// Used by Stat and the proof moment. Reduced motion shows the final number at once.
import * as React from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { Text, type TextProps } from '../components/ui/text';
import { duration as durations } from '../lib/motion';

type NumberRollProps = Omit<TextProps, 'children'> & {
  from?: number;
  to: number;
  delay?: number;
  duration?: number;
  /** Called on the JS thread when the number lands (fire the success haptic here). */
  onDone?: () => void;
  pad?: number;
};

function NumberRoll({ from, to, delay = 0, duration = durations.proof, onDone, pad = 0, ...text }: NumberRollProps) {
  const reduced = useReducedMotion();
  const start = from ?? to;
  const animate = !reduced && start !== to;
  const [value, setValue] = React.useState(start);
  const finish = React.useEffectEvent(() => onDone?.());

  React.useEffect(() => {
    if (!animate) return;
    let raf = 0;
    const timer = setTimeout(() => {
      const t0 = Date.now();
      const tick = () => {
        const t = Math.min(1, (Date.now() - t0) / duration);
        // ease-out cubic: steps slow down as the number lands
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(start + (to - start) * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
        else finish();
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [animate, delay, duration, start, to]);

  const shown = animate ? value : to;
  return (
    <Text accessibilityLabel={String(to)} {...text}>
      {String(shown).padStart(pad, '0')}
    </Text>
  );
}

export { NumberRoll };
