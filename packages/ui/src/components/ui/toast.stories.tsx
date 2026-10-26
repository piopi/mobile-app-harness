import type { Meta, StoryObj } from '@storybook/react-native';
import { Stack } from './stack';
import { Toast } from './toast';

const meta = { title: 'UI/Toast', component: Toast, args: { message: 'Saved' } } satisfies Meta<typeof Toast>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tones: Story = {
  render: () => (
    <Stack gap="md">
      <Toast message="Saved" animated={false} />
      <Toast tone="success" message="Item published" animated={false} />
      <Toast tone="error" message="Couldn't save. Check your connection." action={{ label: 'Retry' }} animated={false} />
    </Stack>
  ),
};
