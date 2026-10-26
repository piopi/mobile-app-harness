// Layout primitive so screens never need className or style: <Stack gap="md" align="center">.
import * as React from 'react';
import { View } from 'react-native';
import { tv, type VariantProps } from '../../lib/utils';

const stackVariants = tv({
  base: 'flex',
  variants: {
    direction: { column: 'flex-col', row: 'flex-row' },
    gap: { none: 'gap-0', xs: 'gap-1', sm: 'gap-2', md: 'gap-4', lg: 'gap-6', xl: 'gap-10' },
    align: { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' },
    justify: { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between' },
    flex: { true: 'flex-1', false: '' },
    wrap: { true: 'flex-wrap', false: '' },
    /** `gutter`: the 16 pt screen gutter, for blocks inside an unpadded (full-bleed) Screen. */
    inset: { none: '', gutter: 'px-4' },
  },
  defaultVariants: { direction: 'column', gap: 'md', align: 'stretch', justify: 'start', flex: false, wrap: false, inset: 'none' },
});

type StackProps = Omit<React.ComponentProps<typeof View>, 'className' | 'style'> & VariantProps<typeof stackVariants>;

function Stack({ direction, gap, align, justify, flex, wrap, inset, ...props }: StackProps) {
  return <View className={stackVariants({ direction, gap, align, justify, flex, wrap, inset })} {...props} />;
}

export { Stack, stackVariants };
export type { StackProps };
