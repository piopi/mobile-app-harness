import type { Meta, StoryObj } from '@storybook/react-native';
import { Stack } from './stack';
import { Text } from './text';

const meta = {
  title: 'UI/Text',
  component: Text,
  args: { children: 'The quick brown fox.' },
  argTypes: { variant: { control: 'select', options: ['display-xl', 'display', 'title-1', 'title-2', 'title-3', 'headline', 'body', 'callout', 'label', 'kicker', 'data', 'micro'] } },
} satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Scale: Story = {
  render: () => (
    <Stack gap="sm">
      <Text variant="display-xl">42</Text>
      <Text variant="display">Display headline.</Text>
      <Text variant="title-1">Title one.</Text>
      <Text variant="title-2">Title two.</Text>
      <Text variant="title-3">Title three</Text>
      <Text variant="headline">Headline</Text>
      <Text variant="body">Body copy is for reading: a sentence or two that explains what happens next.</Text>
      <Text variant="callout" tone="muted">Callout, muted: the secondary line.</Text>
      <Text variant="label">Label</Text>
      <Text variant="kicker" tone="muted">Kicker · metadata</Text>
      <Text variant="data">12:30 · 3.2 km · 004</Text>
      <Text variant="micro" tone="muted">Micro: legal and timestamps</Text>
      <Text variant="body" tone="primary">Primary tone</Text>
      <Text variant="body" tone="danger">Danger tone</Text>
    </Stack>
  ),
};
export const Body: Story = { args: { variant: 'body' } };
