import type { Meta, StoryObj } from '@storybook/react-native';
import { Feature, IconTile } from './feature';
import { Stack } from './stack';

const meta = { title: 'UI/Feature', component: Feature, args: { icon: 'shield', title: 'Private by default.' } } satisfies Meta<typeof Feature>;
export default meta;
type Story = StoryObj<typeof meta>;

export const List: Story = {
  render: () => (
    <Stack gap="lg">
      <Feature icon="shield" title="Private by default." body="Only you see your account." />
      <Feature icon="email" title="No passwords." body="Sign in with a code we email you." />
      <IconTile icon="lock" size="lg" />
    </Stack>
  ),
};
