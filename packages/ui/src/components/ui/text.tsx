// Seeded from react-native-reusables (text), converted to tailwind-variants and the type scale.
// The system font with real weights; data uses tabular figures. Sizes are pt. PROJECT: tune the scale to the brand here.
import { Slot } from '@rn-primitives/slot';
import * as React from 'react';
import { Text as RNText, type Role } from 'react-native';
import { tv, type VariantProps } from '../../lib/utils';
import { cn } from '../../lib/utils';

const textVariants = tv({
  base: 'text-foreground font-normal text-[17px] leading-[24px]',
  variants: {
    variant: {
      // Display weights. display-xl is for one big number.
      'display-xl': 'font-extrabold text-[64px] leading-[64px] tracking-[-1.9px]',
      display: 'font-extrabold text-[44px] leading-[44px] tracking-[-1.3px]',
      'title-1': 'font-extrabold text-[32px] leading-[34px] tracking-[-0.9px]',
      'title-2': 'font-bold text-[24px] leading-[26px] tracking-[-0.24px]',
      'title-3': 'font-bold text-[20px] leading-[24px] tracking-[-0.2px]',
      headline: 'font-semibold text-[17px] leading-[22px]',
      body: 'font-normal text-[17px] leading-[24px]',
      callout: 'font-normal text-[15px] leading-[22px]',
      // Labels and kickers are small and semibold; data is mono with tabular figures.
      label: 'font-semibold text-[14px] leading-[18px]',
      kicker: 'font-semibold text-[12px] leading-[16px] tracking-[0.6px] uppercase',
      data: 'font-normal text-[15px] leading-[20px]',
      micro: 'font-normal text-[12px] leading-[16px]',
      // Aliases kept for the harness screens (map onto the scale above).
      default: 'font-normal text-[17px] leading-[24px]',
      h1: 'font-extrabold text-[32px] leading-[34px] tracking-[-0.9px]',
      h2: 'font-bold text-[24px] leading-[26px] tracking-[-0.24px]',
      h3: 'font-bold text-[20px] leading-[24px] tracking-[-0.2px]',
      lead: 'font-normal text-[17px] leading-[24px]',
      muted: 'font-normal text-muted-foreground text-[15px] leading-[22px]',
      mono: 'font-normal text-[15px] leading-[20px] tracking-[0.3px]',
    },
    align: { left: 'text-left', center: 'text-center', right: 'text-right' },
  },
  defaultVariants: { variant: 'default', align: 'left' },
});

/** Colour. Applied after a parent's TextClassContext, so an explicit tone always wins. */
const toneVariants = tv({
  variants: {
    tone: {
      default: '',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      accent: 'text-accent',
      danger: 'text-danger',
      'on-ink': 'text-on-ink',
      inverse: 'text-primary-foreground',
    },
  },
});

type TextVariantProps = VariantProps<typeof textVariants> & VariantProps<typeof toneVariants>;
type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  'display-xl': 'heading',
  display: 'heading',
  'title-1': 'heading',
  'title-2': 'heading',
  'title-3': 'heading',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  'display-xl': '1',
  display: '1',
  'title-1': '1',
  'title-2': '2',
  'title-3': '3',
  h1: '1',
  h2: '2',
  h3: '3',
};

/** Display styles cap Dynamic Type so heroes never overflow; prose scales fully. */
const MAX_SCALE: Partial<Record<TextVariant, number>> = {
  'display-xl': 1.2,
  display: 1.25,
  'title-1': 1.3,
  label: 1.4,
  kicker: 1.4,
  micro: 1.5,
};

const TABULAR = new Set<TextVariant>(['data', 'display-xl', 'display', 'mono']);

/** Lets a parent (Button, Card) set the text colour of every Text inside it. */
const TextClassContext = React.createContext<string | undefined>(undefined);

type TextProps = React.ComponentProps<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  };

function Text({ className, asChild = false, variant = 'default', tone, align, style, ...props }: TextProps) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      className={cn(textVariants({ variant, align }), textClass, tone ? toneVariants({ tone }) : undefined, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      maxFontSizeMultiplier={variant ? MAX_SCALE[variant] : undefined}
      style={variant && TABULAR.has(variant) ? [{ fontVariant: ['tabular-nums'] }, style] : style}
      {...props}
    />
  );
}

export { Text, TextClassContext, textVariants, toneVariants };
export type { TextProps, TextVariant };
