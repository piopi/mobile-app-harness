import type { Meta, StoryObj } from '@storybook/react-native';
import { Badge } from './badge';
import { Stack } from './stack';

const meta = { title: 'UI/Badge', component: Badge, args: { label: 'Verified' } } satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <Stack gap="md">
      <Stack direction="row" gap="sm" wrap>
        <Badge variant="neutral" label="5" />
        <Badge variant="solid" label="Staff" />
        <Badge variant="solid" label="New" />
        <Badge variant="outline" label="Draft" />
      </Stack>
      <Stack direction="row" gap="lg" wrap>
        <Badge variant="verified" label="Verified" />
        <Badge variant="verified" label="Done" />
        <Badge variant="pending" label="In review" />
        <Badge variant="pending" label="3 left" icon={null} />
      </Stack>
      <Stack direction="row" gap="sm" wrap>
        <Badge variant="accent" label="Featured" />
        <Badge variant="danger" label="Failed" icon="alert" />
      </Stack>
    </Stack>
  ),
};
