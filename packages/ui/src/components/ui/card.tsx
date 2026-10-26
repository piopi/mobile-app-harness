// Seeded from react-native-reusables (card), restyled: token radius, no shadow, separation by surface or hairline.
import * as React from 'react';
import { View } from 'react-native';
import { cn, tv, type VariantProps } from '../../lib/utils';
import { Text, TextClassContext } from './text';

type ViewProps = React.ComponentProps<typeof View>;
type TextProps = React.ComponentProps<typeof Text>;

const cardVariants = tv({
  base: 'flex flex-col gap-4 rounded-lg',
  variants: {
    variant: {
      /** The surface colour. The default grouping. */
      surface: 'bg-surface',
      /** Hairline frame on the ground. */
      outline: 'border-hairline border bg-transparent',
      /** Ink block that reads as night in both themes. */
      ink: 'bg-ink',
      /** No chrome: just the padding rhythm. */
      plain: 'bg-transparent',
    },
    padding: { none: 'py-0', md: 'py-5', lg: 'py-7' },
  },
  defaultVariants: { variant: 'surface', padding: 'md' },
});

type CardProps = ViewProps & VariantProps<typeof cardVariants>;

function Card({ className, variant, padding, ...props }: CardProps) {
  return (
    <TextClassContext.Provider value={variant === 'ink' ? 'text-on-ink' : undefined}>
      <View className={cn(cardVariants({ variant, padding }), className)} {...props} />
    </TextClassContext.Provider>
  );
}

function CardHeader({ className, ...props }: ViewProps) {
  return <View className={cn('flex flex-col gap-1 px-5', className)} {...props} />;
}

function CardTitle(props: TextProps) {
  return <Text variant="title-3" {...props} />;
}

function CardDescription(props: TextProps) {
  return <Text variant="callout" tone="muted" {...props} />;
}

function CardContent({ className, ...props }: ViewProps) {
  return <View className={cn('gap-2 px-5', className)} {...props} />;
}

function CardFooter({ className, ...props }: ViewProps) {
  return <View className={cn('flex flex-row items-center gap-3 px-5', className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants };
export type { CardProps };
