/** The Items screens' copy. PROJECT: the first feature replaces this module. */
export type ItemFilter = 'all' | 'published' | 'drafts';

export const ITEMS = {
  loading: 'Loading…',
  error: 'Items couldn’t load. Check your connection and try again.',
  retry: 'Try again',
  offline: 'You’re offline. Showing what was loaded last.',
  emptyTitle: 'Nothing here yet.',
  emptyBody: 'Items an admin publishes show up here.',
  missing: 'This item isn’t available any more.',
  filterLabel: 'Filter items',
  filters: [
    { value: 'all', label: 'All', testID: 'filter-all' },
    { value: 'published', label: 'Published', testID: 'filter-published' },
    { value: 'drafts', label: 'Drafts', testID: 'filter-drafts' },
  ] as const satisfies readonly { value: ItemFilter; label: string; testID: string }[],
  status: { draft: 'Draft', published: 'Published', archived: 'Archived' },
} as const;
