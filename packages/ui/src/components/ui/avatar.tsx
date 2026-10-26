// Avatar: a circle with initials on the surface, or a photo.
import * as React from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { tv, type VariantProps } from '../../lib/utils';
import { Text } from './text';

const avatarVariants = tv({
  slots: {
    root: 'items-center justify-center overflow-hidden rounded-full bg-surface',
    initials: 'font-bold text-foreground',
  },
  variants: {
    size: {
      sm: { root: 'h-8 w-8', initials: 'text-[11px]' },
      md: { root: 'h-11 w-11', initials: 'text-[14px]' },
      lg: { root: 'h-16 w-16', initials: 'text-[20px]' },
    },
  },
  defaultVariants: { size: 'md' },
});

type AvatarProps = VariantProps<typeof avatarVariants> & { name: string; source?: ImageSourcePropType };

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function Avatar({ name, source, size }: AvatarProps) {
  const s = avatarVariants({ size });
  return (
    <View className={s.root()} accessibilityLabel={name}>
      {source ? <Image source={source} className="h-full w-full" /> : <Text className={s.initials()}>{initialsOf(name)}</Text>}
    </View>
  );
}

export { Avatar, initialsOf };
