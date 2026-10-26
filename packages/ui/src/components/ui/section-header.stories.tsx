import type { Meta, StoryObj } from '@storybook/react-native';
import { SectionHeader } from './section-header';
import { Stack } from './stack';

const meta = { title: 'UI/SectionHeader', component: SectionHeader, args: { title: 'Section' } } satisfies Meta<typeof SectionHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Sizes: Story = {
  render: () => (
    <Stack gap="lg">
      <SectionHeader title="Recent" action={{ label: 'See all' }} />
      <SectionHeader title="This week" size="md" meta="3 of 12" />
      <SectionHeader title="Quiet group" size="sm" />
      <SectionHeader title="Numbered" index="01" rule />
    </Stack>
  ),
};
