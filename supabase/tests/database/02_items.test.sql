-- Items under RLS: members read published ones, staff see every status, admins edit through update_item.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

create function pg_temp.login(who text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', case who
    when 'admin' then '00000000-0000-4000-8000-0000000000ad' when 'staff' then '00000000-0000-4000-8000-00000000005a'
    when 'member' then '00000000-0000-4000-8000-0000000000a1' end)::text, true);
$$;

select seed.reset_base_members();
create temp table fixture as select seed.item('pgTAP draft', publish => false) as draft, seed.item('pgTAP published') as published;
grant select on fixture to authenticated;

set local role authenticated;
select pg_temp.login('member');
select is((select count(*)::int from public.items where id = (select draft from fixture)), 0, 'a member does not see drafts');
select is((select count(*)::int from public.items where id = (select published from fixture)), 1, 'a member sees published items');
select pg_temp.login('staff');
select is((select count(*)::int from public.items where id = (select draft from fixture)), 1, 'staff see drafts');

select pg_temp.login('admin');
select is((public.update_item((select draft from fixture), '{"status":"published","title":"Now live"}')).status, 'published'::public.item_status, 'an admin publishes a draft');
select isnt((select published_at from public.items where id = (select draft from fixture)), null, 'publishing stamps published_at');
select is((public.update_item((select draft from fixture), '{"summary":null}')).summary, null, 'null clears a field');

select * from finish();
rollback;
