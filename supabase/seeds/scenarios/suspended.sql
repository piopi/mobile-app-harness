-- sign-in: held@app.test
-- Morgan's account is suspended: the hold screen, and every member RPC refused.
select seed.add_member('00000000-0000-4000-8000-0000000000c5', '00000000-0000-4000-9000-0000000000c5', 'held@app.test', 'Morgan');
update public.members set status = 'suspended' where id = '00000000-0000-4000-9000-0000000000c5';
