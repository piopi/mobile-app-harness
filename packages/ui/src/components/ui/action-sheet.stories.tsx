import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { ActionSheet } from './action-sheet';

const meta = { title: 'UI/ActionSheet', component: View, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof View>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ChoiceList: Story = {
  render: () => (
    <ActionSheet
      open
      onOpenChange={() => {}}
      title="Appearance"
      message="Follow the phone, or keep one look."
      options={[
        { value: 'system', label: 'System', selected: true },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
      ]}
      onSelect={() => {}}
    />
  ),
};

export const WithDestructive: Story = {
  render: () => (
    <ActionSheet
      open
      onOpenChange={() => {}}
      title="This item"
      options={[
        { value: 'edit', label: 'Edit' },
        { value: 'share', label: 'Share' },
        { value: 'delete', label: 'Delete', destructive: true },
      ]}
      onSelect={() => {}}
    />
  ),
};
