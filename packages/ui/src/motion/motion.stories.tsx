import type { Meta, StoryObj } from '@storybook/react-native';
import * as React from 'react';
import { View } from 'react-native';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ListRow, ListRowDate } from '../components/ui/list-row';
import { Stack } from '../components/ui/stack';
import { Text } from '../components/ui/text';
import { FadeInBackground } from './fade-in-background';
import { NumberRoll } from './number-roll';
import { PressScale } from './press-scale';
import { Stagger } from './stagger';

const meta = {
  title: 'Motion/Primitives',
  component: FadeInBackground,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof FadeInBackground>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Remount on press so the motion can be replayed on device. */
function Replay({ children }: { children: (k: number) => React.ReactNode }) {
  const [k, setK] = React.useState(0);
  return (
    <View className="flex-1">
      {children(k)}
      <View className="absolute bottom-10 right-4">
        <Button size="sm" variant="secondary" label="Replay" onPress={() => setK((n) => n + 1)} />
      </View>
    </View>
  );
}

export const FadeInHero: Story = {
  render: () => (
    <Replay>
      {(k) => (
        <View key={k} className="bg-background flex-1">
          <FadeInBackground height="tall">
            <Stack flex justify="end" inset="gutter" gap="xs">
              <Text variant="kicker">Hero · no photo</Text>
              <Text variant="display">A hero that settles.</Text>
            </Stack>
          </FadeInBackground>
        </View>
      )}
    </Replay>
  ),
};

export const StaggeredBlocks: Story = {
  render: () => (
    <Replay>
      {(k) => (
        <View key={k} className="bg-background flex-1 px-4 pt-20">
          <Stagger gap="md">
            <Text variant="title-1">Recent</Text>
            <ListRow leading={<ListRowDate day={22} month="OCT" />} title="First thing" subtitle="Pending" trailing={<Badge variant="pending" label="Pending" />} />
            <ListRow leading={<ListRowDate day={15} month="OCT" />} title="Second thing" subtitle="Done" trailing={<Badge variant="verified" label="Done" />} />
            <ListRow leading={<ListRowDate day={8} month="OCT" />} title="Third thing" subtitle="Done" trailing={<Badge variant="verified" label="Done" />} />
          </Stagger>
        </View>
      )}
    </Replay>
  ),
};

export const PressAndRoll: Story = {
  render: () => (
    <Replay>
      {(k) => (
        <View key={k} className="bg-background flex-1 justify-center gap-6 px-4">
          <PressScale weight="object" onPress={() => {}}>
            <Card>
              <CardContent>
                <Text variant="title-3">Press me</Text>
                <Text variant="callout" tone="muted">An object-weight press: settles, never bounces.</Text>
              </CardContent>
            </Card>
          </PressScale>
          <NumberRoll from={0} to={128} variant="display-xl" />
        </View>
      )}
    </Replay>
  ),
};
