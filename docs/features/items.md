# Items (list + detail)

**Status:** template placeholder. Replace it with the first real feature, or rename it.

## Capabilities

- Members read published items; staff and admins also see drafts and filter by status.
- A list with every state (loading, empty, error, offline) and a detail pushed on the tab's stack.

## What admins can customise

- Items themselves: `create_item`, `update_item(patch)` (title, summary, body, status, order).

## Where it lives

`public.items` in the foundation migration, `apps/mobile/src/app/(tabs)/items`, `src/features/items`, `packages/shared/src/schemas.ts` (`item`).

## Ideas to expand

- Search, pagination, images, an admin editor.
