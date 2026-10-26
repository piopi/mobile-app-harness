-- The account gates and the RPCs behind them. Fixture ids in the …f1 range, so the file passes on any scenario.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

create function pg_temp.login(who text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', case who
    when 'admin' then '00000000-0000-4000-8000-0000000000ad' when 'staff' then '00000000-0000-4000-8000-00000000005a'
    when 'ada' then '00000000-0000-4000-8000-0000000000a1' when 'new' then '00000000-0000-4000-8000-0000000000f1' end)::text, true);
$$;

select seed.reset_base_members();
select seed.add_member('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-9000-0000000000f1', 'f1@app.test', null, null, onboarded => false, joined => now());

-- ─── Modes ─────────────────────────────────────────────────────────────────────────────────────────
set local role anon;
select is(public.launch_status() ->> 'mode', 'signed_out', 'signed out');
reset role;
set local role authenticated;
select pg_temp.login('new');
select is(public.launch_status() ->> 'mode', 'onboarding', 'a new account onboards first');
select throws_ok($$select public.complete_onboarding('Fi', 'One', '0.1', true)$$, 'P0001', 'terms_version_mismatch', 'onboarding needs the current terms');
select throws_ok($$select public.complete_onboarding('Fi', 'One', (select version from public.terms_versions where is_current), false)$$, 'P0001', 'adult_required', 'onboarding needs 18+');
select is(public.complete_onboarding('Fi', 'One', (select version from public.terms_versions where is_current), true) ->> 'mode', 'member', 'onboarding opens the app');

select pg_temp.login('ada');
select is(public.launch_status() ->> 'mode', 'member', 'Ada is a member');
select is(public.launch_status() -> 'roles', '["member"]'::jsonb, 'with the member role only');

-- ─── Roles and admin RPCs ──────────────────────────────────────────────────────────────────────────
select throws_ok($$select public.create_item('Nope')$$, '42501', 'admin_only', 'a member cannot create items');
select pg_temp.login('staff');
select throws_ok($$select public.publish_terms_version('9.9', 't', 'b', 'l')$$, '42501', 'admin_only', 'staff cannot publish terms');
select pg_temp.login('admin');
select throws_ok($$select public.update_item(gen_random_uuid(), '{"colour":"red"}')$$, 'P0001', 'invalid_patch', 'unknown patch keys fail');
select lives_ok($$select public.publish_terms_version('9.9', 'Terms', '# Terms', 'I accept 9.9.', array['Everything'])$$, 'an admin publishes terms');

-- ─── Terms re-accept ───────────────────────────────────────────────────────────────────────────────
select pg_temp.login('ada');
select is(public.launch_status() ->> 'mode', 'terms', 'a new version opens the re-accept gate');
select is(public.launch_status() -> 'terms' -> 'changes', '["Everything"]'::jsonb, 'with what changed');
select is(public.accept_terms('9.9') ->> 'mode', 'member', 'accepting reopens the app');

-- ─── Suspension ────────────────────────────────────────────────────────────────────────────────────
reset role;
update public.members set status = 'suspended' where id = '00000000-0000-4000-9000-0000000000f1';
set local role authenticated;
select pg_temp.login('new');
select is(public.launch_status() ->> 'mode', 'suspended', 'a suspended account is held');
select throws_ok($$select public.accept_terms('9.9')$$, '42501', 'suspended', 'and every member RPC refuses it');

select * from finish();
rollback;
