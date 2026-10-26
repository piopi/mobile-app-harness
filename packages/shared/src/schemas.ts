import { z } from 'zod';
import { appRole, itemStatus, memberStatus } from './rpc';

/** Roles: every member is a `member`; `staff` and `admin` are grants (member_roles). */
export const memberRole = appRole;
export type MemberRole = z.infer<typeof memberRole>;

/** A row of `members` as the member (or staff) reads it under RLS. */
export const member = z.object({
  id: z.uuid(),
  email: z.string().nullable(),
  first_name: z.string().min(1).max(60).nullable(),
  last_name: z.string().min(1).max(60).nullable(),
  status: memberStatus,
  onboarding_completed_at: z.string().nullable(),
  created_at: z.string(),
});
export type Member = z.infer<typeof member>;

/** Profile fields a member may edit directly (column grants on `members`). */
export const profileUpdate = z.object({
  first_name: z.string().trim().min(1).max(60),
  last_name: z.string().trim().min(1).max(60),
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

/** "Ada L.": how names leave the server on shared screens. */
export function shortName(first: string | null, last: string | null, fallback = 'Member'): string {
  const f = first?.trim() ?? '';
  const l = last?.trim() ?? '';
  return [f, l ? `${l[0]}.` : ''].filter(Boolean).join(' ') || fallback;
}
