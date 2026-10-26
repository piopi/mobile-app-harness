-- The foundation every app made from the template starts with: members linked to Supabase Auth, roles as grants,
-- terms versions as data with consents, account status, app settings as one admin-edited row, an append-only
-- audit log, a generic `items` catalogue (the list + detail pattern), the launch status that drives the app's
-- account gates, and the access-token claims hook.
--
-- Conventions (AGENTS.md): every table has RLS; reads go direct under RLS; anything that grants value or changes
-- someone else's data goes through a security definer RPC; RPCs fail with a snake_case code (P0001 rule, 42501
-- access) listed in packages/shared/src/rpc.ts RPC_ERROR_CODES; admin edits take a jsonb patch.

create extension if not exists pgcrypto with schema extensions;

-- Internal, non-exposed schema (not in the API's schemas): helpers the RPCs share.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ─── Types ─────────────────────────────────────────────────────────────────────────────────────────
-- `member` is implicit (every member row); the others are grants in member_roles.
create type public.app_role as enum ('member', 'staff', 'admin');
create type public.member_status as enum ('active', 'suspended');
create type public.consent_kind as enum ('terms', 'marketing');
create type public.item_status as enum ('draft', 'published', 'archived');

-- ─── Members ───────────────────────────────────────────────────────────────────────────────────────
create table public.members (
  id uuid primary key default gen_random_uuid(),
  -- The Supabase Auth identity. The member id stays the only id the app uses (members.id is not auth.uid()).
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  email text,
  -- The generic profile: a display name, and when the account was created and finished onboarding.
  display_name text check (display_name is null or char_length(display_name) between 1 and 60),
  -- PROJECT: EXAMPLE onboarding field, optional. Replace or delete it (and its zod schema, form field and the
  -- complete_onboarding argument); the recipe is in the db-change skill, "Add an onboarding field or step".
  about text check (about is null or char_length(about) <= 280),
  status public.member_status not null default 'active',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.members is 'One row per person, linked to one auth.users identity (created by the auth trigger).';

create table public.member_roles (
  member_id uuid not null references public.members (id) on delete cascade,
  role public.app_role not null check (role <> 'member'),
  granted_by uuid references public.members (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (member_id, role)
);

-- ─── Terms versions and consents ───────────────────────────────────────────────────────────────────
-- The terms are data: an admin publishes a version (title, light-markdown body, acceptance line, what changed) and
-- every member accepts it again before the app opens. Published versions are never edited in place.
create table public.terms_versions (
  version text primary key check (char_length(version) between 1 and 20),
  title text not null check (char_length(title) between 1 and 200),
  -- Light markdown: "# " title, "## " headings, "- " bullets, **strong**, blank lines between blocks.
  body text not null check (char_length(body) between 1 and 60000),
  accept_label text not null check (char_length(accept_label) between 1 and 1000),
  changes text[] not null default '{}',
  is_current boolean not null default false,
  published_at timestamptz not null default now()
);
create unique index terms_versions_one_current on public.terms_versions (is_current) where is_current;

-- PROJECT: replace this placeholder with your real terms through publish_terms_version (or a migration).
insert into public.terms_versions (version, title, body, accept_label, is_current) values
  ('1.0', 'Terms of use',
   E'# Terms of use\n\n**Placeholder terms, version 1.0.** Replace this text before launch.\n\n## Using the app\n\nBe kind, keep your account to yourself, and tell us when something looks wrong.\n\n## Your data\n\n- We keep what you give us to run your account.\n- You can ask us to delete it at any time.',
   'I have read and accept the terms of use (version 1.0).', true);

create table public.consents (
  member_id uuid not null references public.members (id) on delete cascade,
  kind public.consent_kind not null,
  version text not null check (char_length(version) between 1 and 40),
  granted boolean not null,
  granted_at timestamptz not null default now(),
  primary key (member_id, kind)
);

-- ─── App settings (one row, admin-edited) ──────────────────────────────────────────────────────────
-- The place for project values the app shows or enforces. A new value is a column here (or its own table) plus an
-- admin path to change it, never a literal in SQL, code or copy.
create table public.app_settings (
  id boolean primary key default true check (id),
  contact_email text check (contact_email is null or contact_email ~ '^[^@\s]+@[^@\s]+$'),
  updated_by uuid references public.members (id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (true);

-- ─── Items: the generic list + detail catalogue ────────────────────────────────────────────────────
-- A stand-in for the app's first real collection (posts, products, sessions…): members read published ones,
-- admins create, edit, publish and archive through RPCs. Rename or replace it with your first feature.
create table public.items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  summary text check (summary is null or char_length(summary) <= 300),
  body text check (body is null or char_length(body) <= 20000),
  status public.item_status not null default 'draft',
  sort integer not null default 0,
  published_at timestamptz,
  created_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'draft') = (published_at is null))
);
create index items_status_sort_idx on public.items (status, sort, published_at desc);

-- ─── Audit log (append-only) ───────────────────────────────────────────────────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.members (id) on delete set null,
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  target_type text not null,
  target_id text,
  detail text,
  at timestamptz not null default now()
);

create function private.audit_log_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '42501', message = 'audit_log_append_only';
end;
$$;
create trigger audit_log_append_only before update or delete on public.audit_log
  for each row execute function private.audit_log_append_only();

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger members_touch before update on public.members for each row execute function private.touch_updated_at();
create trigger items_touch before update on public.items for each row execute function private.touch_updated_at();
create trigger app_settings_touch before update on public.app_settings for each row execute function private.touch_updated_at();

-- ─── Auth → members ────────────────────────────────────────────────────────────────────────────────
-- Every new auth user gets a member row. Seeds may pin the member id through raw_app_meta_data.member_id.
create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.members (id, auth_user_id, email)
  values (coalesce((new.raw_app_meta_data ->> 'member_id')::uuid, gen_random_uuid()), new.id, lower(new.email));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_auth_user();

create function private.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.members set email = lower(new.email) where auth_user_id = new.id;
  return new;
end;
$$;
create trigger on_auth_user_updated after update of email on auth.users
  for each row execute function private.handle_auth_user_updated();

-- ─── Who is asking (policy helpers) ────────────────────────────────────────────────────────────────
-- security definer so policy checks don't recurse through RLS. Roles are read from member_roles on every call:
-- the JWT `app_roles` claim is a UI hint only.
create function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id from public.members m where m.auth_user_id = (select auth.uid());
$$;

create function public.has_role(check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m
     where m.auth_user_id = (select auth.uid()) and m.status = 'active'
       and (check_role = 'member'
            or exists (select 1 from public.member_roles r where r.member_id = m.id and r.role = check_role)));
$$;

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('staff') or public.has_role('admin');
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('admin');
$$;

create function public.my_roles()
returns public.app_role[]
language sql
stable
security definer
set search_path = ''
as $$
  select array['member'::public.app_role] || coalesce(array_agg(r.role order by r.role), '{}')
    from public.member_roles r
   where r.member_id = public.current_member_id();
$$;

-- ─── Errors and gates (private) ────────────────────────────────────────────────────────────────────
create function private.fail(code text, hint text default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = code, hint = coalesce(hint, code);
end;
$$;

create function private.forbid(code text default 'forbidden')
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '42501', message = code, hint = 'You do not have access to this.';
end;
$$;

create function private.current_terms_version()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select version from public.terms_versions where is_current;
$$;

-- The signed-in member, checked for the gates an action needs: always active; onboarded and on the current terms
-- for anything that grants value (pass `onboarded => false` / `current_terms => false` to relax).
create function private.require_member(onboarded boolean default true, current_terms boolean default true)
returns public.members
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m public.members;
begin
  if (select auth.uid()) is null then
    perform private.forbid('not_signed_in');
  end if;
  select * into m from public.members where auth_user_id = (select auth.uid());
  if not found then
    perform private.forbid('not_signed_in');
  end if;
  if m.status <> 'active' then
    perform private.forbid('suspended');
  end if;
  if require_member.onboarded and m.onboarded_at is null then
    perform private.fail('onboarding_required', 'Finish setting up your account first.');
  end if;
  if require_member.current_terms and not exists (
    select 1 from public.consents c
     where c.member_id = m.id and c.kind = 'terms' and c.granted and c.version = private.current_terms_version()) then
    perform private.fail('terms_required', 'Accept the current terms first.');
  end if;
  return m;
end;
$$;

create function private.require_admin()
returns public.members
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m public.members;
begin
  m := private.require_member(onboarded => false, current_terms => false);
  if not public.is_admin() then
    perform private.forbid('admin_only');
  end if;
  return m;
end;
$$;

create function private.audit(actor uuid, action text, target_type text, target_id text, detail text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, target_type, target_id, detail)
  values (actor, action, target_type, target_id, detail);
$$;

-- Admin patches: an absent key keeps the value, null clears it, an unknown key fails with invalid_patch.
create function private.check_patch(patch jsonb, allowed text[])
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  k text;
begin
  if patch is null or jsonb_typeof(patch) <> 'object' then
    perform private.fail('invalid_patch', 'Send the changes as an object.');
  end if;
  for k in select jsonb_object_keys(patch) loop
    if not k = any (allowed) then
      perform private.fail('invalid_patch', format('Unknown field: %s', k));
    end if;
  end loop;
end;
$$;

-- ─── Launch status: which account gate the app opens ───────────────────────────────────────────────
-- One call on launch (and after anything that can move the member): the gate (`mode`) and what the gates show.
-- Modes, in order: signed_out, suspended, onboarding, terms (a new version to accept), member.
-- PROJECT: an onboarding step that must be complete before the app opens adds its check to the `onboarding`
-- case below (for example `or m.<column> is null`).
create function public.launch_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m public.members;
  accepted text;
  current text := private.current_terms_version();
  mode text;
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('mode', 'signed_out');
  end if;
  select * into m from public.members where auth_user_id = (select auth.uid());
  if not found then
    return jsonb_build_object('mode', 'signed_out');
  end if;
  select c.version into accepted from public.consents c where c.member_id = m.id and c.kind = 'terms' and c.granted;
  mode := case
    when m.status = 'suspended' then 'suspended'
    when m.onboarded_at is null then 'onboarding'
    when accepted is distinct from current then 'terms'
    else 'member' end;
  return jsonb_build_object(
    'mode', mode,
    'member_id', m.id,
    'email', m.email,
    'display_name', m.display_name,
    'contact_email', (select s.contact_email from public.app_settings s),
    'roles', to_jsonb(public.my_roles()),
    'is_staff', public.is_staff(),
    'is_admin', public.is_admin(),
    'terms', jsonb_build_object(
      'current_version', current,
      'accepted_version', accepted,
      'changes', coalesce((select to_jsonb(t.changes) from public.terms_versions t where t.is_current), '[]'::jsonb)));
end;
$$;

-- ─── Member RPCs ───────────────────────────────────────────────────────────────────────────────────
-- Onboarding in one call: the display name, the current terms, the optional marketing consent, and the EXAMPLE
-- `about` field. The gate stays on onboarding until this succeeds, so nothing is ever half-saved.
-- PROJECT: a new onboarding field is a column above, an argument here (validated here, saved in the update),
-- a key in `onboardingProfile` (packages/shared) and a field or step in apps/mobile/src/app/(onboarding).
create function public.complete_onboarding(display_name text, terms_version text, marketing boolean default false, about text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  m public.members;
begin
  m := private.require_member(onboarded => false, current_terms => false);
  if nullif(btrim(complete_onboarding.display_name), '') is null then
    perform private.fail('name_required', 'Enter a display name.');
  end if;
  if complete_onboarding.terms_version is distinct from private.current_terms_version() then
    perform private.fail('terms_version_mismatch', 'The terms changed while you were reading. Read the new version.');
  end if;
  begin
    update public.members set
      display_name = btrim(complete_onboarding.display_name),
      about = nullif(btrim(complete_onboarding.about), ''),
      onboarded_at = coalesce(onboarded_at, now())
     where id = m.id;
  exception when check_violation then
    perform private.fail('invalid_profile', 'One of the values is too long.');
  end;
  insert into public.consents (member_id, kind, version, granted) values
    (m.id, 'terms', complete_onboarding.terms_version, true),
    (m.id, 'marketing', '1.0', coalesce(complete_onboarding.marketing, false))
  on conflict (member_id, kind) do update set version = excluded.version, granted = excluded.granted, granted_at = now();
  return public.launch_status();
end;
$$;

-- Accept the current terms (the re-accept gate).
create function public.accept_terms(version text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  m public.members;
begin
  m := private.require_member(onboarded => true, current_terms => false);
  if accept_terms.version is distinct from private.current_terms_version() then
    perform private.fail('terms_version_mismatch', 'The terms changed while you were reading. Read the new version.');
  end if;
  insert into public.consents (member_id, kind, version, granted) values (m.id, 'terms', accept_terms.version, true)
  on conflict (member_id, kind) do update set version = excluded.version, granted = true, granted_at = now();
  return public.launch_status();
end;
$$;

-- ─── Admin RPCs ────────────────────────────────────────────────────────────────────────────────────
create function public.publish_terms_version(version text, title text, body text, accept_label text, changes text[] default '{}')
returns public.terms_versions
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  actor public.members;
  row public.terms_versions;
begin
  actor := private.require_admin();
  if exists (select 1 from public.terms_versions t where t.version = publish_terms_version.version) then
    perform private.fail('terms_exists', 'That version is already published.');
  end if;
  update public.terms_versions set is_current = false where is_current;
  begin
    insert into public.terms_versions (version, title, body, accept_label, changes, is_current)
    values (btrim(publish_terms_version.version), btrim(publish_terms_version.title), publish_terms_version.body,
            btrim(publish_terms_version.accept_label), coalesce(publish_terms_version.changes, '{}'), true)
    returning * into row;
  exception when check_violation or not_null_violation then
    perform private.fail('invalid_terms', 'Give the version a number, a title, a text and an acceptance line.');
  end;
  perform private.audit(actor.id, 'terms.publish', 'terms_versions', row.version);
  return row;
end;
$$;

create function public.update_app_settings(patch jsonb)
returns public.app_settings
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  actor public.members;
  row public.app_settings;
begin
  actor := private.require_admin();
  perform private.check_patch(patch, array['contact_email']);
  begin
    update public.app_settings s set
      contact_email = case when patch ? 'contact_email' then lower(nullif(btrim(patch ->> 'contact_email'), '')) else s.contact_email end,
      updated_by = actor.id
     where s.id
    returning s.* into row;
  exception when check_violation then
    perform private.fail('invalid_settings', 'One of the values is not valid.');
  end;
  perform private.audit(actor.id, 'settings.update', 'app_settings', 'app', (select string_agg(k, ', ' order by k) from jsonb_object_keys(patch) k));
  return row;
end;
$$;

create function public.create_item(title text, summary text default null, body text default null, publish boolean default false, sort integer default 0)
returns public.items
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  actor public.members;
  row public.items;
begin
  actor := private.require_admin();
  if nullif(btrim(create_item.title), '') is null then
    perform private.fail('title_required', 'Give the item a title.');
  end if;
  begin
    insert into public.items (title, summary, body, status, published_at, sort, created_by)
    values (btrim(create_item.title), nullif(btrim(create_item.summary), ''), nullif(btrim(create_item.body), ''),
            case when create_item.publish then 'published' else 'draft' end::public.item_status,
            case when create_item.publish then now() end, coalesce(create_item.sort, 0), actor.id)
    returning * into row;
  exception when check_violation then
    perform private.fail('invalid_item', 'One of the values is too long.');
  end;
  perform private.audit(actor.id, 'item.create', 'items', row.id::text);
  return row;
end;
$$;

create function public.update_item(item_id uuid, patch jsonb)
returns public.items
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  actor public.members;
  row public.items;
  next_status public.item_status;
begin
  actor := private.require_admin();
  perform private.check_patch(patch, array['title', 'summary', 'body', 'status', 'sort']);
  if patch ? 'title' and nullif(btrim(patch ->> 'title'), '') is null then
    perform private.fail('title_required', 'Give the item a title.');
  end if;
  begin
    next_status := case when patch ? 'status' then (patch ->> 'status')::public.item_status end;
    update public.items i set
      title = case when patch ? 'title' then btrim(patch ->> 'title') else i.title end,
      summary = case when patch ? 'summary' then nullif(btrim(patch ->> 'summary'), '') else i.summary end,
      body = case when patch ? 'body' then nullif(btrim(patch ->> 'body'), '') else i.body end,
      sort = case when patch ? 'sort' then (patch ->> 'sort')::integer else i.sort end,
      status = coalesce(next_status, i.status),
      published_at = case
        when next_status is null then i.published_at
        when next_status = 'draft' then null
        else coalesce(i.published_at, now()) end
     where i.id = update_item.item_id
    returning i.* into row;
  exception when check_violation or invalid_text_representation or numeric_value_out_of_range then
    perform private.fail('invalid_item', 'One of the values is not valid.');
  end;
  if row.id is null then
    perform private.fail('item_not_found', 'That item no longer exists.');
  end if;
  perform private.audit(actor.id, 'item.update', 'items', row.id::text, (select string_agg(k, ', ' order by k) from jsonb_object_keys(patch) k));
  return row;
end;
$$;

create function public.grant_role(member_id uuid, role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  actor public.members;
begin
  actor := private.require_admin();
  if grant_role.role = 'member' then
    perform private.fail('invalid_role', 'Every member already has the member role.');
  end if;
  if not exists (select 1 from public.members m where m.id = grant_role.member_id) then
    perform private.fail('member_not_found', 'No such member.');
  end if;
  insert into public.member_roles (member_id, role, granted_by) values (grant_role.member_id, grant_role.role, actor.id)
  on conflict do nothing;
  perform private.audit(actor.id, 'role.grant', 'members', grant_role.member_id::text, grant_role.role::text);
end;
$$;

create function public.revoke_role(member_id uuid, role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  actor public.members;
begin
  actor := private.require_admin();
  if revoke_role.member_id = actor.id and revoke_role.role = 'admin' then
    perform private.fail('cannot_revoke_own_admin', 'Ask another admin to remove your admin role.');
  end if;
  delete from public.member_roles r where r.member_id = revoke_role.member_id and r.role = revoke_role.role;
  perform private.audit(actor.id, 'role.revoke', 'members', revoke_role.member_id::text, revoke_role.role::text);
end;
$$;

create function public.set_member_status(member_id uuid, status public.member_status, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  actor public.members;
begin
  actor := private.require_admin();
  if set_member_status.member_id = actor.id then
    perform private.fail('cannot_change_own_status', 'Ask another admin.');
  end if;
  update public.members m set status = set_member_status.status where m.id = set_member_status.member_id;
  if not found then
    perform private.fail('member_not_found', 'No such member.');
  end if;
  perform private.audit(actor.id, 'member.status', 'members', set_member_status.member_id::text, concat_ws(': ', set_member_status.status::text, set_member_status.reason));
end;
$$;

-- ─── Access-token claims hook ──────────────────────────────────────────────────────────────────────
-- Adds `app_roles` and `member_id` to the JWT (enabled in config.toml). A UI hint only: RLS and RPCs read
-- member_roles on every call, so a revoked role stops working before the token expires.
create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (event ->> 'user_id')::uuid;
  mid uuid;
  roles text[];
  claims jsonb := coalesce(event -> 'claims', '{}');
begin
  select m.id,
         array['member'] || coalesce((select array_agg(r.role::text order by r.role) from public.member_roles r where r.member_id = m.id), '{}')
    into mid, roles
    from public.members m
   where m.auth_user_id = uid and m.status = 'active';
  claims := jsonb_set(claims, '{app_roles}', coalesce(to_jsonb(roles), '[]'::jsonb));
  if mid is not null then
    claims := jsonb_set(claims, '{member_id}', to_jsonb(mid));
  end if;
  return jsonb_set(event, '{claims}', claims);
end;
$$;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant select on public.members, public.member_roles to supabase_auth_admin;

-- ─── Row level security ────────────────────────────────────────────────────────────────────────────
alter table public.members enable row level security;
alter table public.member_roles enable row level security;
alter table public.terms_versions enable row level security;
alter table public.consents enable row level security;
alter table public.app_settings enable row level security;
alter table public.items enable row level security;
alter table public.audit_log enable row level security;

-- Clients never write tables directly, except a member's own profile (column grant below). Everything else is an RPC.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from anon;
grant update (display_name, about) on public.members to authenticated;
-- The current terms are public (signed-out screens may show them).
grant select on public.terms_versions to anon;

create policy members_auth_admin on public.members as permissive for select to supabase_auth_admin using (true);
create policy member_roles_auth_admin on public.member_roles as permissive for select to supabase_auth_admin using (true);

-- members: yourself; staff see everyone.
create policy members_select on public.members for select to authenticated
  using (auth_user_id = (select auth.uid()) or (select public.is_staff()));
create policy members_update_own on public.members for update to authenticated
  using (auth_user_id = (select auth.uid()) and status = 'active')
  with check (auth_user_id = (select auth.uid()));

create policy member_roles_select on public.member_roles for select to authenticated
  using (member_id = (select public.current_member_id()) or (select public.is_admin()));

create policy terms_versions_select on public.terms_versions for select to anon, authenticated using (true);

create policy consents_select on public.consents for select to authenticated
  using (member_id = (select public.current_member_id()) or (select public.is_admin()));

create policy app_settings_select on public.app_settings for select to authenticated using (true);

-- items: members read published ones; staff and admins also see drafts and archived ones.
create policy items_select on public.items for select to authenticated
  using (status = 'published' or (select public.is_staff()));

create policy audit_log_select on public.audit_log for select to authenticated using ((select public.is_admin()));

-- ─── Function privileges ───────────────────────────────────────────────────────────────────────────
revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.launch_status() to anon, authenticated;
grant execute on function
  public.current_member_id(), public.has_role(public.app_role), public.is_staff(), public.is_admin(), public.my_roles(),
  public.complete_onboarding(text, text, boolean, text), public.accept_terms(text),
  public.publish_terms_version(text, text, text, text, text[]), public.update_app_settings(jsonb),
  public.create_item(text, text, text, boolean, integer), public.update_item(uuid, jsonb),
  public.grant_role(uuid, public.app_role), public.revoke_role(uuid, public.app_role),
  public.set_member_status(uuid, public.member_status, text)
  to authenticated;
