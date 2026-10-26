// Seeded from react-native-reusables (button), converted to tailwind-variants and the design tokens:
// radius from the config (rounded-md), primary fill, a semibold label, 52 pt primary height, a settling press
// scale. PROJECT: restyle the variants to the brand here, never in a screen.
import * as React from 'react';
import { Pressable } from 'react-native';
import { haptics, type HapticName } from '../../lib/haptics';
import { cn, tv, type VariantProps } from '../../lib/utils';
import { PressScale } from '../../motion/press-scale';
import { Icon, type IconName, type IconTone } from './icon';
import { Text, TextClassContext } from './text';

const buttonVariants = tv({
  base: 'group shrink-0 flex-row items-center justify-center gap-2 rounded-md',
  variants: {
    variant: {
      /** The one primary action on a screen. */
      primary: 'bg-primary',
      /** Outline on the ground. Secondary actions. */
      secondary: 'border-control border bg-transparent',
      /** Text only. Tertiary actions in rows. */
      ghost: 'bg-transparent',
      /** Inline link. No padding, no height. */
      link: 'bg-transparent',
      /** The brand accent, for the rare highlight that is not the primary action. */
      accent: 'bg-accent',
      /** On top of a photo or the night ground, whatever the theme. */
      'on-ink': 'bg-on-ink',
      /** Confirms a destructive action (delete, sign out). */
      destructive: 'bg-danger',
    },
    size: {
      default: 'h-[52px] px-[26px]',
      sm: 'h-10 px-4',
      lg: 'h-14 px-7',
      /** A native header item (Close, Sign out): a 44 pt target with room on both sides inside the iOS glass item. */
      header: 'h-11 px-3',
    },
    block: { true: 'self-stretch', false: '' },
  },
  compoundVariants: [
    { variant: 'link', className: 'h-auto self-start px-0 py-1' },
    { variant: 'link', size: 'header', className: 'h-11 self-auto px-3 py-0' },
  ],
  defaultVariants: { variant: 'primary', size: 'default', block: false },
});

const buttonTextVariants = tv({
  base: 'font-sans-semibold text-[16px] leading-[20px]',
  variants: {
    variant: {
      primary: 'text-primary-foreground',
      secondary: 'text-foreground',
      ghost: 'text-foreground',
      link: 'text-primary',
      accent: 'text-accent-foreground',
      'on-ink': 'text-ink',
      destructive: 'text-primary-foreground',
    },
  },
  defaultVariants: { variant: 'primary' },
});

type ButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    /** Haptic on press. Default: none. Use `tap` for commits (save, add); never for navigation. */
    haptic?: HapticName;
    /** Shorthand for a single label child. */
    label?: string;
    /** Leading icon, tinted like the label (check, close). Never a text glyph like ✓. */
    icon?: IconName;
    /** Trailing text glyph ("→"). */
    trailing?: string;
  };

const ICON_TONE: Record<NonNullable<ButtonProps['variant']>, IconTone> = {
  primary: 'inverse',
  secondary: 'default',
  ghost: 'default',
  link: 'primary',
  accent: 'accent-foreground',
  'on-ink': 'ink',
  destructive: 'inverse',
};

function Button({ className, variant, size, block, haptic, label, icon, trailing, children, onPress, ...props }: ButtonProps) {
  const content =
    label !== undefined ? (
      <>
        {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 18} tone={ICON_TONE[variant ?? 'primary']} /> : null}
        <Text>
          {label}
          {trailing ? `  ${trailing}` : ''}
        </Text>
      </>
    ) : (
      children
    );
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant })}>
      <PressScale
        className={cn(buttonVariants({ variant, size, block }), className)}
        role="button"
        accessibilityLabel={label}
        onPress={(e) => {
          if (haptic) haptics[haptic]();
          onPress?.(e);
        }}
        {...props}
      >
        {content as React.ReactNode}
      </PressScale>
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
