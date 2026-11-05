---
name: db-change
description: >-
  Change the Supabase backend safely: a new migration (tables, RLS policies, RPCs), seed and scenario
  updates, regenerated types, pgTAP and Vitest integration tests, all against this worktree's own stack.
  Use for any change under supabase/.
---

# db-change

The backend is Supabase (CLI 2.122.0, `stack` mode). Every worktree has its own stack; never use `supabase start` or fixed ports.

## Steps

1. **Stack up.** `pnpm wt up` or `pnpm sb start` (writes `.env.local`).
2. **Model the capability first.** Name the general capability behind the ticket and what an admin will want to change later (AGENTS.md, "Build capabilities, not one-offs"). Every project value the feature shows or enforces (a place, a time, a threshold, a window, a label set) is a seeded, admin-editable row or column, not a literal.
3. **Migration.** `pnpm sb migration new <name>` creates `supabase/migrations/<timestamp>_<name>.sql`. Write it by hand:
   - every new table: `enable row level security` and explicit policies per role (`member`, `staff`, `admin`);
   - helper functions used in policies: `security definer`, `set search_path = ''`;
   - **value-granting writes** go through an RPC (`security definer`, checks inside) or an Edge Function, never a direct insert policy for members;
   - end with the privileges: `revoke execute on function … from public, anon;` then `grant execute … to authenticated` for each new RPC (Supabase's default privileges grant every new function to anon).
4. **Apply.** `pnpm sb db reset --local --yes` (migrations + `seed.sql`). Fix until it applies cleanly.
5. **Seed and scenarios.** Keep `supabase/seed.sql` minimal and valid for the new schema. Project values production also needs are seeded **by the migration** with fixed ids (not `seed.sql`), and seeds name them through `seed.<name>()` helpers. Update the scenario files in `supabase/seeds/scenarios/` that the change affects, or add one (`-- sign-in: <email>` on line 1, then a one-line description). A scenario that should go through an admin RPC (so audit rows are real) calls `seed.act_as('admin@app.test')` first. Check them all: `for s in $(pnpm -s seed | cut -d' ' -f1); do pnpm -s seed $s; done`.
6. **Types.** `pnpm --filter @app/shared gen:types`, commit `database.types.ts`, then add the zod input schema for every new RPC to `rpcInputs` in `packages/shared/src/rpc.ts` (and a result schema if it returns JSON). `pnpm typecheck` fails until every RPC has a schema that matches its generated `Args`.
7. **pgTAP.** `supabase/tests/database/<nn>_<area>.test.sql`: table exists, RLS on, each role can and cannot do what it should. Copy the `pg_temp.login(who)` helper from `01_gates.test.sql`, then `set local role authenticated; select pg_temp.login('member');` and `reset role;` to go back to postgres for setup. Call `seed.reset_base_members()` first and use fixture ids that no scenario uses (the `…f1`–`…f9` range), so the file passes on any scenario. Make counts relative. Add new policies to `00_schema.test.sql` (`policies_are`). `pnpm test:db`.
8. **Integration.** `supabase/tests/integration/<area>.test.ts`, using the helpers below; every new table goes in `rls.test.ts`. `pnpm test:integration` (it resets your stack: re-seed before you go back to the app).
9. **Verify** in the app if a screen reads the data (verify-in-app, `pnpm seed <scenario>`, then `pnpm agent refetch`).

## The foundation (migration `20260101000000_foundation`)

- **Members** link to `auth.users` (`auth_user_id`); a trigger creates the member row on sign-up. `members.id` is not `auth.uid()`: `current_member_id()` maps one to the other. The generic profile is `display_name`, `created_at` and `onboarded_at`; `about` is an EXAMPLE onboarding field to replace ("Add an onboarding field or step" below).
- **Roles**: `member_roles` holds `staff` and `admin` grants (`member` is implicit). `has_role`, `is_staff` (staff or admin), `is_admin`, `my_roles` read it on every call. The access-token hook (`custom_access_token_hook`, enabled in `config.toml`) adds `app_roles` and `member_id` claims as UI hints only.
- **Gates**: `launch_status()` returns the mode the app's account gates follow (`signed_out`, `suspended`, `onboarding`, `terms`, `member`) and what the gate screens show. A new account state is a new mode here and a new gate in the app.
- **Terms** are data: `terms_versions` (one current), `consents`; `publish_terms_version` (admin) makes everyone re-accept; `complete_onboarding` and `accept_terms` record acceptance.
- **Settings**: `app_settings`, one admin-edited row (`update_app_settings(patch)`). A new project value is a column here (or its own table) plus its admin path.
- **Items**: the generic list + detail catalogue (`create_item`, `update_item(patch)`); replace it with the first real feature.
- **Audit**: every staff or admin action calls `private.audit(actor, 'area.verb', target_type, target_id, detail)` in the same transaction; `audit_log` is append-only.
- **Private schema** (`private.*`) is not exposed: helpers the RPCs share. Clients have no usage on it.
- **Writes**: clients have no table write privileges except the name columns of `members`. Everything else is an RPC.

## Add an onboarding field or step

The template's onboarding is a PROJECT slot: a display name, the terms and an optional marketing consent, plus one EXAMPLE optional field (`members.about`, "About you") to replace. A new field touches five places, in one PR:

1. **Column.** A migration adds it to `public.members` with its check (`alter table public.members add column … check (…)`), and to the column grant if members may edit it later (`grant update (…) on public.members to authenticated`).
2. **RPC.** Replace `public.complete_onboarding` (drop and recreate it with the new argument, defaulted when optional), validate it with `private.fail('<code>', …)`, save it in the same `update`, and add any new code to `RPC_ERROR_CODES`. Re-grant execute.
3. **Gate.** If the app must not open without it, add the check to the `onboarding` case of `public.launch_status()` (`when m.onboarded_at is null or m.<column> is null then 'onboarding'`). A field collected later, outside onboarding, needs no gate.
4. **Schemas.** `pnpm --filter @app/shared gen:types`, then add the key to `profileUpdate` in `packages/shared/src/schemas.ts` and to `complete_onboarding` in `rpcInputs` (`rpc.ts`); typecheck fails until they match.
5. **Screen.** A `Field` in `apps/mobile/src/app/(onboarding)/profile.tsx` (copy in `features/auth/copy.ts`), or a new step: a screen in `(onboarding)/` declared in its `_layout.tsx` under the onboarding guard, that writes to the draft (`features/onboarding/draft.ts`) and pushes the next step; only the last step calls `complete_onboarding`.

Then: pgTAP in `01_gates.test.sql` (the new rule and, if gated, the mode), the integration test in `auth-gates.test.ts`, the RNTL test in `onboarding.test.tsx`, the Maestro flow `auth-email-onboarding.yaml`, and the screenshots. Delete the `about` example when the first real field lands.

## Writing an RPC

- `security definer`, `set search_path = ''`, fully qualified names (`public.items`, `extensions.digest`).
- Start with the gate: `private.require_member()` (active, onboarded, current terms; pass `onboarded => false` / `current_terms => false` to relax) or `private.require_admin()`.
- Fail with `private.fail('<code>', '<hint>')` (P0001) or `private.forbid('<code>')` (42501), and add the code to `RPC_ERROR_CODES` in `packages/shared/src/rpc.ts`. The app maps codes to copy.
- Admin edits take a jsonb `patch`: `private.check_patch(patch, array[…])` first; an absent key keeps the value, `null` clears it, an unknown key fails with `invalid_patch`. The zod patch schema is `.strict()` to match.
- Use the database clock (`now()`), never a client time.
- Parameters shadow columns: `#variable_conflict use_variable`, then `fn_name.param`.

## Seeds and scenarios

`seed.sql` creates a local-only `seed` schema of helpers, then the base data: `admin@app.test`, `staff@app.test`, `member@app.test`, `member2@app.test` (password123), four items, the contact email.

| Helper | Does |
|--------|------|
| `seed.add_member(auth_id, member_id, email, first, last, onboarded, terms, roles, joined)` | an auth user plus member and consents |
| `seed.item(title, summary, body, publish, sort)` | an item, published unless `publish => false` |
| `seed.act_as(email)` | call the real RPCs as that account for the rest of the scenario (`null` clears it) |
| `seed.reset_base_members()` | Ada and Bo back to their base state; pgTAP files call it first |

Scenarios (`pnpm seed` lists them with their sign-in): onboarding, terms-outdated, suspended, staff, empty-items, many-items.

## Integration test helpers

`supabase/tests/integration/helpers/index.ts`:

| Helper | Use |
|--------|-----|
| `useScenario(name)` | at the top of a file: resets the database to that scenario once, before the file's tests (files run one at a time) |
| `asRole('member' \| 'staff' \| 'admin' \| 'anon')` | a supabase-js client signed in as the seeded account for that role (cached per file) |
| `signIn(email)`, `newAccount(prefix)` | any seeded account; a brand-new account through real sign-up |
| `db.query` / `db.one` | postgres as the owner, for setup and assertions (bypasses RLS) |
| `expectOk`, `expectRpcError(result, code)`, `expectForbidden(result, code?)` | the error contract |
| `IDS` | seeded member ids |

## Debugging a hosted project

Local stacks hide hosted-only failures (new API keys, secrets, cold starts). To read a hosted project's logs without the dashboard, ask the Management API (the human's personal access token, never committed):

```bash
curl -sG "https://api.supabase.com/v1/projects/$REF/analytics/endpoints/logs" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  --data-urlencode "iso_timestamp_start=2026-01-01T10:00:00Z" --data-urlencode "iso_timestamp_end=2026-01-01T11:00:00Z" \
  --data-urlencode "sql=select timestamp, source, event_message from logs where source = 'function_logs' order by timestamp desc limit 100"
```

- One table, `logs`, in the ClickHouse dialect: pick the stream with `source` (`edge_logs` for the API gateway's requests and status codes, `function_logs` for an Edge Function's own output, `postgres_logs`, `auth_logs`). Name the columns you want; `select *` and the dashboard's per-source table names don't work here.
- Without timestamps it reads only the last minute; a range is at most 24 hours.
- A 401 "Expected 3 parts in JWT" in `edge_logs` is a new `sb_secret_`/`sb_publishable_` key sent as a bearer (AGENTS.md).

## Rules

- Never edit an applied migration that is on `main`; add a new one.
- No secrets in migrations or seeds. Local fakes for third-party services.
- A test that tampers with a value must change it to something guaranteed to differ (a random value can collide).
- `[auth]` changes in `config.toml` need `pnpm sb stop && pnpm sb start`: a plain start resumes the old containers.
- CI runs the same: stack start, every scenario, pgTAP, Vitest.
