import { z } from 'zod';
import type { Database } from './database.types';

/**
 * Zod schemas for every RPC's input, keyed by the Postgres function name. Validate on the client
 * before calling `supabase.rpc(name, args)`; the function validates again in the database.
 * The compile-time checks at the bottom keep each schema in step with the generated `Args`, and fail
 * `pnpm typecheck` when an RPC has no schema here.
 */

const uuid = z.uuid();
const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const appRole = z.enum(['member', 'staff', 'admin']);
export const memberStatus = z.enum(['active', 'suspended']);
export const consentKind = z.enum(['terms', 'adult', 'marketing']);
export const itemStatus = z.enum(['draft', 'published', 'archived']);

const empty = z.object({}).strict();

/**
 * Admin edits take a patch: an absent key keeps the value, null clears a nullable field. The
 * database refuses unknown keys (invalid_patch), so the patches are strict.
 */
export const appSettingsPatch = z
  .object({
    /** Shown on the hold screens; null clears it. */
    contact_email: z.email().max(254).nullable(),
  })
  .partial()
  .strict();
export const itemPatch = z
  .object({
    title: text(160),
    summary: text(300).nullable(),
    body: text(20000).nullable(),
    status: itemStatus,
    sort: z.number().int(),
  })
  .partial()
  .strict();

export const rpcInputs = {
  // Everyone
  launch_status: empty,
  // Member
  complete_onboarding: z.object({
    first_name: text(60),
    last_name: text(60),
    terms_version: text(20),
    adult: z.literal(true),
    marketing: z.boolean().optional(),
  }),
  accept_terms: z.object({ version: text(20) }),
  // Admin
  publish_terms_version: z.object({
    version: text(20),
    title: text(200),
    body: z.string().trim().min(1).max(60000),
    accept_label: text(1000),
    changes: z.array(text(300)).max(20).optional(),
  }),
  update_app_settings: z.object({ patch: appSettingsPatch }),
  create_item: z.object({
    title: text(160),
    summary: optionalText(300),
    body: optionalText(20000),
    publish: z.boolean().optional(),
    sort: z.number().int().optional(),
  }),
  update_item: z.object({ item_id: uuid, patch: itemPatch }),
  grant_role: z.object({ member_id: uuid, role: appRole.exclude(['member']) }),
  revoke_role: z.object({ member_id: uuid, role: appRole.exclude(['member']) }),
  set_member_status: z.object({ member_id: uuid, status: memberStatus, reason: optionalText(500) }),
} as const;

export type RpcName = keyof typeof rpcInputs;
export type RpcInput<N extends RpcName> = z.infer<(typeof rpcInputs)[N]>;

/** Validate an RPC's arguments with its schema; throws a ZodError on bad input. */
export function parseRpcInput<N extends RpcName>(name: N, args: unknown): RpcInput<N> {
  return rpcInputs[name].parse(args ?? {}) as RpcInput<N>;
}

/**
 * Stable error codes the RPCs raise (SQLSTATE P0001, or 42501 for access). The client maps them to copy.
 * `error.message` from supabase-js carries the code; `error.hint` carries a plain-English fallback.
 */
export const RPC_ERROR_CODES = [
  // access (42501)
  'not_signed_in', 'suspended', 'staff_only', 'admin_only', 'forbidden',
  // gates
  'onboarding_required', 'terms_required',
  // onboarding and terms
  'name_required', 'adult_required', 'terms_version_mismatch', 'terms_exists', 'invalid_terms',
  // admin
  'invalid_patch', 'invalid_settings', 'title_required', 'invalid_item', 'item_not_found',
  'invalid_role', 'member_not_found', 'cannot_revoke_own_admin', 'cannot_change_own_status',
] as const;
export type RpcErrorCode = (typeof RPC_ERROR_CODES)[number];

export function rpcErrorCode(error: { message?: string } | null | undefined): RpcErrorCode | null {
  const code = error?.message;
  return code && (RPC_ERROR_CODES as readonly string[]).includes(code) ? (code as RpcErrorCode) : null;
}

// ─── Results of the JSON-returning RPCs ───────────────────────────────────────────────────────────

export const launchMode = z.enum(['signed_out', 'suspended', 'onboarding', 'terms', 'member']);
export const launchStatus = z.object({
  mode: launchMode,
  member_id: uuid.optional(),
  /** The account's email ("Signed in as"); null for an Apple identity that shared no email. */
  email: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  /** The project's contact email (app_settings), for the hold screens. Null until an admin sets one. */
  contact_email: z.string().nullable().optional(),
  roles: z.array(appRole).optional(),
  is_staff: z.boolean().optional(),
  is_admin: z.boolean().optional(),
  terms: z
    .object({
      current_version: z.string(),
      accepted_version: z.string().nullable(),
      /** "What changed" in the current version; empty when there is nothing to show. */
      changes: z.array(z.string()),
    })
    .optional(),
});
export type LaunchStatus = z.infer<typeof launchStatus>;

// Compile-time: every schema's output is assignable to the generated function Args.
type Functions = Database['public']['Functions'];
type ArgsOf<N extends RpcName> = N extends keyof Functions ? Functions[N]['Args'] : never;
type Assignable<A, B> = [A] extends [B] ? true : false;
type CheckAll = { [N in RpcName]: Assignable<RpcInput<N>, ArgsOf<N> extends Record<PropertyKey, never> ? object : ArgsOf<N>> };
type AssertTrue<T extends true> = T;
export type _RpcArgsInSync = AssertTrue<CheckAll[RpcName]>;
// Compile-time: every RPC in the database has a schema here (helpers used by policies excepted).
type PolicyHelper = 'current_member_id' | 'has_role' | 'is_staff' | 'is_admin' | 'my_roles' | 'custom_access_token_hook';
export type _EveryRpcHasASchema = AssertTrue<[Exclude<keyof Functions, RpcName | PolicyHelper>] extends [never] ? true : false>;
