import type { Meta, StoryObj } from '@storybook/react-native';
import * as React from 'react';
import { Checkbox } from './checkbox';
import { Stack } from './stack';

const meta = { title: 'UI/Checkbox', component: Checkbox, args: { checked: false, onCheckedChange: () => {}, label: 'I am 18 or older.' } } satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;

function Live(props: { label: string; description?: string; emphasis?: 'default' | 'strong'; invalid?: boolean; initial?: boolean }) {
  const [checked, setChecked] = React.useState(props.initial ?? false);
  return <Checkbox {...props} checked={checked} onCheckedChange={setChecked} />;
}

export const States: Story = {
  render: () => (
    <Stack gap="md">
      <Live label="I am 18 or older." emphasis="strong" />
      <Live label="Send me product updates." description="Optional. Unsubscribe any time." initial />
      <Live label="I accept the terms." invalid />
      <Checkbox checked={false} onCheckedChange={() => {}} disabled label="Disabled" />
    </Stack>
  ),
};
