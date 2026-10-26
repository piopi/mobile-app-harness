import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { Icon, iconNames } from './icon';
import { Stack } from './stack';
import { Text } from './text';

const meta = { title: 'UI/Icon', component: Icon, args: { name: 'check' } } satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = {
  render: () => (
    <Stack gap="md">
      {iconNames.map((name) => (
        <View key={name} className="flex-row items-center gap-4">
          <Icon name={name} size={14} />
          <Icon name={name} size={20} weight="light" />
          <Icon name={name} size={20} />
          <Icon name={name} size={20} weight="fill" />
          <Text variant="label">{name}</Text>
        </View>
      ))}
    </Stack>
  ),
};
