import type { Meta, StoryObj } from '@storybook/react-native';
import * as React from 'react';
import { FilterChips } from './filter-chips';

const meta = { title: 'UI/FilterChips', component: FilterChips } satisfies Meta<typeof FilterChips>;
export default meta;
type Story = StoryObj<typeof meta>;

function Live() {
  const [value, setValue] = React.useState<'all' | 'published' | 'drafts'>('all');
  return (
    <FilterChips
      label="Filter items"
      value={value}
      onChange={setValue}
      options={[
        { value: 'all', label: 'All' },
        { value: 'published', label: 'Published' },
        { value: 'drafts', label: 'Drafts' },
      ]}
    />
  );
}

export const Default: Story = { args: { label: 'Filter items', value: 'all', onChange: () => {}, options: [] }, render: () => <Live /> };
