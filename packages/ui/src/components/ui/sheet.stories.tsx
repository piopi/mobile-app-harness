import type { Meta, StoryObj } from '@storybook/react-native';
import { Button } from './button';
import { Sheet } from './sheet';
import { Stack } from './stack';
import { Text } from './text';

const meta = { title: 'UI/Sheet', component: Sheet, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof Sheet>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {
  render: () => (
    <Stack flex justify="end">
      <Sheet presentation="inline" kicker="Sheet · formSheet route" title="A short task">
        <Text variant="body" tone="muted">Sheets are routes with presentation: formSheet. This draws the content rhythm only.</Text>
        <Button block label="Confirm" />
        <Button block variant="ghost" label="Not now" />
      </Sheet>
    </Stack>
  ),
};

export const Night: Story = {
  render: () => (
    <Stack flex justify="end">
      <Sheet presentation="inline" ground="ink" kicker="Forced dark" title="A night moment">
        <Text variant="body" tone="on-ink">The same in both themes.</Text>
      </Sheet>
    </Stack>
  ),
};
