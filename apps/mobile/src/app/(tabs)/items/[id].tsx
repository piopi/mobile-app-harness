import { proseBlocks } from '@app/shared';
import { Badge, Prose, Screen, Stack, Text } from '@app/ui';
import { Stack as RouterStack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ITEMS } from '../../../features/items/copy';
import { useItem } from '../../../features/items/queries';

/** An item's detail: pushed on the Items stack; the title goes into the native header once it loads. */
export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useItem(id);
  const body = item.data?.body ?? null;
  const blocks = useMemo(() => (body ? proseBlocks(body) : []), [body]);

  return (
    <Screen native testID="item-screen">
      <RouterStack.Screen options={{ title: item.data?.title ?? '' }} />
      {item.isPending ? (
        <Text variant="callout" tone="muted">
          {ITEMS.loading}
        </Text>
      ) : item.isError || !item.data ? (
        <Text variant="body" testID="item-missing">
          {ITEMS.missing}
        </Text>
      ) : (
        <Stack gap="md">
          {item.data.status === 'published' ? null : <Badge variant="outline" label={ITEMS.status[item.data.status]} />}
          <Text variant="title-1">{item.data.title}</Text>
          {item.data.summary ? (
            <Text variant="body" tone="muted">
              {item.data.summary}
            </Text>
          ) : null}
          {blocks.length ? <Prose blocks={blocks} /> : null}
        </Stack>
      )}
    </Screen>
  );
}
