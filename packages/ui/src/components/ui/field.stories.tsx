import type { Meta, StoryObj } from '@storybook/react-native';
import { Field } from './field';
import { Input } from './input';
import { Stack } from './stack';

const meta = { title: 'UI/Field', component: Field, args: { label: 'Email', children: null } } satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <Stack gap="lg">
      <Field label="Email" hint="We'll email you a 6-digit code.">
        <Input placeholder="you@example.com" />
      </Field>
      <Field label="Email" error="Enter a valid email address.">
        <Input state="error" value="ada@" />
      </Field>
    </Stack>
  ),
};
