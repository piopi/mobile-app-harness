import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { Button } from './button';
import { Stack } from './stack';
import { Text } from './text';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { variant: 'primary', size: 'default', label: 'Continue' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'link', 'accent', 'on-ink', 'destructive'] },
    size: { control: 'select', options: ['sm', 'default', 'lg', 'header'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <Stack gap="md">
      <Text variant="kicker" tone="muted">Primary · one per screen</Text>
      <Button block label="Continue" trailing="→" />
      <Text variant="kicker" tone="muted">Secondary</Text>
      <Button variant="secondary" block label="Not now" />
      <Text variant="kicker" tone="muted">Ghost · Link</Text>
      <Button variant="ghost" label="Skip" />
      <Button variant="link" label="See all" trailing="→" />
      <Text variant="kicker" tone="muted">Header item (native header buttons)</Text>
      <Button variant="link" size="header" icon="close" label="Close" />
      <Text variant="kicker" tone="muted">Sizes</Text>
      <Stack direction="row" gap="sm" align="center">
        <Button size="sm" label="Save" />
        <Button size="sm" variant="secondary" label="Edit" />
      </Stack>
      <Text variant="kicker" tone="muted">Accent · Destructive</Text>
      <Button variant="accent" block label="Try the new thing" />
      <Button variant="destructive" block icon="sign-out" label="Sign out" />
      <Text variant="kicker" tone="muted">On the night ground</Text>
      <View className="bg-ink p-4">
        <Button variant="on-ink" block label="Done" />
      </View>
      <Text variant="kicker" tone="muted">Disabled</Text>
      <Button block disabled label="Opens later" />
    </Stack>
  ),
};
export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary', label: 'Not now' } };
