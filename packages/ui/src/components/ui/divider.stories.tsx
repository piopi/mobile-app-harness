import type { Meta, StoryObj } from '@storybook/react-native';
import { Divider } from './divider';
import { Stack } from './stack';
import { Text } from './text';

const meta = { title: 'UI/Divider', component: Divider } satisfies Meta<typeof Divider>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <Stack gap="md">
      <Text variant="kicker" tone="muted">Hairline</Text>
      <Divider />
      <Text variant="kicker" tone="muted">Strong</Text>
      <Divider tone="strong" />
      <Text variant="kicker" tone="muted">With a word</Text>
      <Divider label="or" />
    </Stack>
  ),
};
