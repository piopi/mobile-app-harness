// Feature: an icon on a tile, then a headline and a line of explanation. For short "how it works"
// lists and the one mark on a hold screen (IconTile alone).
import * as React from 'react';
import { View } from 'react-native';
import { tv, type VariantProps } from '../../lib/utils';
import { Icon, type IconName } from './icon';
import { Text } from './text';

const tileVariants = tv({
  base: 'bg-surface border-hairline items-center justify-center rounded-lg border',
  variants: { size: { md: 'size-12', lg: 'size-16' } },
  defaultVariants: { size: 'md' },
});

type IconTileProps = VariantProps<typeof tileVariants> & { icon: IconName; testID?: string };

function IconTile({ icon, size, testID }: IconTileProps) {
  return (
    <View className={tileVariants({ size })} testID={testID}>
      <Icon name={icon} size={size === 'lg' ? 28 : 22} />
    </View>
  );
}

type FeatureProps = { icon: IconName; title: string; body?: string; testID?: string };

function Feature({ icon, title, body, testID }: FeatureProps) {
  return (
    <View className="flex-row items-start gap-4" testID={testID}>
      <IconTile icon={icon} />
      <View className="flex-1 gap-1">
        <Text variant="headline">{title}</Text>
        {body ? (
          <Text variant="callout" tone="muted">
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export { Feature, IconTile, tileVariants };
export type { FeatureProps, IconTileProps };
