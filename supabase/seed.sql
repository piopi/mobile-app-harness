-- Base seed, applied by every `supabase db reset`. Scenarios in seeds/scenarios/ layer on top
-- (`pnpm seed <scenario>`). Local only: this file never runs against a hosted project.
--
-- Every account signs in with password "password123". Fixed ids so tests and scenarios can use them:
-- the auth user id and the member id share their last digits (auth …-8000-…, member …-9000-…).
--   admin@app.test    Alex     admin
--   staff@app.test    Sam      staff
--   member@app.test   Jordan   member
--   member2@app.test  Casey    member
-- Project data production needs too (the current terms, app_settings) is seeded by the migrations, not here.
-- This file adds people, a few items, and the local contact email.

-- ─── Seed helpers (schema `seed`, local only) ──────────────────────────────────────────────────────
create schema if not exists seed;

-- A Supabase Auth user plus its member row (created by the auth trigger with the pinned id).
create or replace function seed.add_member(
  auth_id uuid, member_id uuid, email text, display_name text,
  onboarded boolean default true, terms text default null, roles public.app_role[] default '{}',
  joined timestamptz default now() - interval '120 days'
) returns uuid language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', auth_id, 'authenticated', 'authenticated', email,
    extensions.crypt('password123', extensions.gen_salt('bf')), joined,
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'member_id', member_id),
    '{}', joined, joined, '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), auth_id, auth_id::text,
    jsonb_build_object('sub', auth_id::text, 'email', email, 'email_verified', true), 'email', joined, joined, joined);
  update public.members m set created_at = joined where m.id = add_member.member_id;
  if onboarded then
    update public.members m
       set display_name = add_member.display_name, onboarded_at = joined
     where m.id = add_member.member_id;
    insert into public.consents (member_id, kind, version, granted, granted_at) values
      (add_member.member_id, 'terms', coalesce(add_member.terms, private.current_terms_version()), true, joined),
      (add_member.member_id, 'marketing', '1.0', false, joined);
  end if;
  insert into public.member_roles (member_id, role) select add_member.member_id, r from unnest(roles) r;
  return member_id;
end $$;

-- An item, published unless `publish => false`.
create or replace function seed.item(title text, summary text default null, body text default null, publish boolean default true, sort integer default 0)
returns uuid language sql as $$
  insert into public.items (title, summary, body, status, published_at, sort)
  values (item.title, item.summary, item.body, case when item.publish then 'published' else 'draft' end::public.item_status,
          case when item.publish then now() - make_interval(days => item.sort) end, item.sort)
  returning id;
$$;

-- Call the real RPCs as this account for the rest of the scenario (`null` clears it), so audit rows are real.
create or replace function seed.act_as(email text) returns void language sql as $$
  select set_config('request.jwt.claims', coalesce((
    select json_build_object('role', 'authenticated', 'sub', u.id)::text from auth.users u where u.email = act_as.email), ''), false);
$$;

-- Put the two base members back to their base-seed state (pgTAP files call this first so they pass on any scenario).
create or replace function seed.reset_base_members() returns void language plpgsql as $$
declare
  ids uuid[] := array['00000000-0000-4000-9000-0000000000a1', '00000000-0000-4000-9000-0000000000b2']::uuid[];
begin
  update public.consents set version = private.current_terms_version(), granted = true where member_id = any (ids) and kind = 'terms';
  update public.members set status = 'active' where id = any (ids);
  delete from public.member_roles where member_id = any (ids);
end $$;

-- ─── People ────────────────────────────────────────────────────────────────────────────────────────
select seed.add_member('00000000-0000-4000-8000-0000000000ad', '00000000-0000-4000-9000-0000000000ad', 'admin@app.test', 'Alex', roles => '{admin}');
select seed.add_member('00000000-0000-4000-8000-00000000005a', '00000000-0000-4000-9000-00000000005a', 'staff@app.test', 'Sam', roles => '{staff}');
select seed.add_member('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-9000-0000000000a1', 'member@app.test', 'Jordan');
select seed.add_member('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-9000-0000000000b2', 'member2@app.test', 'Casey');

-- ─── Data ──────────────────────────────────────────────────────────────────────────────────────────
select seed.item('Welcome', 'What this app does, in one line.', E'## Start here\n\nThis item is seed data. Replace the items catalogue with your first real feature.', sort => 0);
select seed.item('Second item', 'A published item with a short summary.', sort => 1);
select seed.item('Third item', 'Another one, so the list scrolls a little.', sort => 2);
select seed.item('Draft item', 'Only staff and admins see drafts.', publish => false, sort => 3);
update public.app_settings set contact_email = 'hello@app.test';
