import { Badge, Button, FilterChips, ListRow, Screen, Stack, Text } from '@app/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { ITEMS, type ItemFilter } from '../../../features/items/copy';
import { useItems } from '../../../features/items/queries';
import { useAgentState } from '../../../dev/agent-events';
import { useSession } from '../../../lib/session';

/**
 * The list + detail pattern: a query hook, every state (loading, empty, error, offline), a role variant (staff see
 * drafts and a filter), and a push to the detail on the tab's own stack. Replace `items` with your first feature.
 */
export default function Items() {
  const { isStaff } = useSession();
  const { offline } = useAgentState();
  const [filter, setFilter] = useState<ItemFilter>('all');
  const items = useItems();

  const shown = (items.data ?? []).filter((i) => filter === 'all' || (filter === 'published' ? i.status === 'published' : i.status !== 'published'));

  return (
    <Screen native testID="items-screen">
      {isStaff ? <FilterChips label={ITEMS.filterLabel} options={ITEMS.filters} value={filter} onChange={setFilter} testID="items-filter" /> : null}
      {offline ? (
        <Text variant="callout" tone="muted" testID="items-offline">
          {ITEMS.offline}
        </Text>
      ) : null}
      {items.isPending ? (
        <Text variant="callout" tone="muted" testID="items-loading">
          {ITEMS.loading}
        </Text>
      ) : items.isError ? (
        <Stack gap="md" testID="items-error">
          <Text variant="body">{ITEMS.error}</Text>
          <Button variant="secondary" label={ITEMS.retry} onPress={() => void items.refetch()} testID="items-retry" />
        </Stack>
      ) : shown.length === 0 ? (
        <Stack gap="xs" testID="items-empty">
          <Text variant="title-3">{ITEMS.emptyTitle}</Text>
          <Text variant="callout" tone="muted">
            {ITEMS.emptyBody}
          </Text>
        </Stack>
      ) : (
        <Stack gap="none" testID="items-list">
          {shown.map((item) => (
            <ListRow
              key={item.id}
              title={item.title}
              subtitle={item.summary ?? undefined}
              trailing={item.status === 'published' ? undefined : <Badge variant="outline" label={ITEMS.status[item.status]} />}
              arrow
              onPress={() => router.push({ pathname: '/items/[id]', params: { id: item.id } })}
              testID={`item-${item.id}`}
            />
          ))}
        </Stack>
      )}
    </Screen>
  );
}
