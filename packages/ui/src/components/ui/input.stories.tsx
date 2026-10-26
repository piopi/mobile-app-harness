import type { Meta, StoryObj } from '@storybook/react-native';
import { Input } from './input';
import { Stack } from './stack';

const meta = { title: 'UI/Input', component: Input } satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Kinds: Story = {
  render: () => (
    <Stack gap="md">
      <Input placeholder="Email" />
      <Input icon="search" placeholder="Search" />
      <Input kind="code" value="123456" />
      <Input kind="multiline" placeholder="A few lines" />
      <Input state="error" value="not-an-email" />
    </Stack>
  ),
};
