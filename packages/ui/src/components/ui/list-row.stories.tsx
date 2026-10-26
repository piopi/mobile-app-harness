import type { Meta, StoryObj } from '@storybook/react-native';
import { Avatar } from './avatar';
import { Badge } from './badge';
import { Button } from './button';
import { ListRow, ListRowDate, ListRowIndex, ListRowThumb } from './list-row';
import { Stack } from './stack';

const meta = { title: 'UI/ListRow', component: ListRow, args: { title: 'A row' } } satisfies Meta<typeof ListRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <Stack gap="none">
      <ListRow title="Navigation row" subtitle="With a subtitle" arrow onPress={() => {}} />
      <ListRow leading={<ListRowDate day={15} month="OCT" />} title="Dated row" subtitle="A status on the right" trailing={<Badge variant="verified" label="Done" />} />
      <ListRow leading={<ListRowIndex index={1} />} title="Indexed row" trailing="42" />
      <ListRow leading={<ListRowThumb source={null} />} title="Thumbnail without a photo" subtitle="Empty tile" />
      <ListRow leading={<Avatar name="Ada Lovelace" />} title="Ada Lovelace" subtitle="With an action" trailing={<Button size="sm" label="Add" />} />
      <ListRow title="Ada L. (you)" trailing="5" highlight />
      <ListRow title="Archived row" subtitle="Greyed out" archived />
      <ListRow title="Compact row" density="compact" divider={false} />
    </Stack>
  ),
};
