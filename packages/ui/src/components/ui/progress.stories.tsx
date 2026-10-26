import type { Meta, StoryObj } from '@storybook/react-native';
import { Progress } from './progress';
import { Stack } from './stack';

const meta = { title: 'UI/Progress', component: Progress, args: { step: 1, of: 2, label: 'Your details' } } satisfies Meta<typeof Progress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Steps: Story = {
  render: () => (
    <Stack gap="lg">
      <Progress step={1} of={2} label="Your details" />
      <Progress step={2} of={2} label="Terms" />
    </Stack>
  ),
};
