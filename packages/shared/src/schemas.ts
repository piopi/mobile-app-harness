import { z } from 'zod';
import { appRole, itemStatus, memberStatus } from './rpc';

/** Roles: every member is a `member`; `staff` and `admin` are grants (member_roles). */
export const memberRole = appRole;
export type MemberRole = z.infer<typeof memberRole>;

/** A row of `members` as the member (or staff) reads it under RLS. */
export const member = z.object({
  id: z.uuid(),
  email: z.string().nullable(),
  display_name: z.string().min(1).max(60).nullable(),
  /** PROJECT: EXAMPLE onboarding field; replace or delete it. */
  about: z.string().max(280).nullable(),
  status: memberStatus,
  onboarded_at: z.string().nullable(),
  created_at: z.string(),
});
export type Member = z.infer<typeof member>;

/**
 * The profile a member fills in at onboarding and may edit directly (column grants on `members`).
 * PROJECT: a new onboarding field is a key here, a column and a `complete_onboarding` argument in the database,
 * and a field in apps/mobile/src/app/(onboarding)/profile.tsx (recipe: the db-change skill).
 */
export const profileUpdate = z.object({
  display_name: z.string().trim().min(1).max(60),
  /** EXAMPLE optional field: replace or delete it. */
  about: z.string().trim().max(280).optional(),
});

/** An item (the list + detail catalogue) as the app reads it under RLS. */
export const item = z.object({
  id: z.uuid(),
  title: z.string(),
  summary: z.string().nullable(),
  body: z.string().nullable(),
  status: itemStatus,
  sort: z.number().int(),
  published_at: z.string().nullable(),
});
export type Item = z.infer<typeof item>;
export const ITEM_COLUMNS = 'id, title, summary, body, status, sort, published_at' as const;

/** Staff means the staff role, or admin. */
export function isStaff(roles: MemberRole | readonly MemberRole[]): boolean {
  const list = typeof roles === 'string' ? [roles] : roles;
  return list.includes('staff') || list.includes('admin');
}

/** The name to show for a member: the display name, or a fallback while there is none. */
export function displayName(name: string | null | undefined, fallback = 'Member'): string {
  return name?.trim() || fallback;
}
