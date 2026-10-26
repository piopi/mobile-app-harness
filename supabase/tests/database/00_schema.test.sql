-- The schema's guarantees: every public table has RLS on, the policies are exactly these, clients cannot write
-- tables directly (except their own name), and private helpers are not callable from the API.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select is(
  (select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0,
  'every public table has row level security on');

select policies_are('public', 'members', array['members_select', 'members_update_own', 'members_auth_admin']);
select policies_are('public', 'items', array['items_select']);
select policies_are('public', 'terms_versions', array['terms_versions_select']);

select ok(not has_table_privilege('authenticated', 'public.items', 'insert'), 'clients cannot insert items directly');
select ok(not has_table_privilege('authenticated', 'public.consents', 'insert'), 'clients cannot write consents directly');
select ok(has_column_privilege('authenticated', 'public.members', 'first_name', 'update'), 'members may edit their own name');
select ok(not has_function_privilege('authenticated', 'private.require_member(boolean, boolean)', 'execute'), 'private helpers are not callable');
select ok(not has_function_privilege('anon', 'public.create_item(text, text, text, boolean, integer)', 'execute'), 'anon cannot call admin RPCs');

select * from finish();
rollback;
