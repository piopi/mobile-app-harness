-- sign-in: ada@app.test
-- An admin published terms 2.0 (with "what changed"); Ada accepted 1.0, so the re-accept gate opens.
select seed.act_as('admin@app.test');
select public.publish_terms_version('2.0', 'Terms of use',
  E'# Terms of use\n\n**Placeholder terms, version 2.0.** Replace this text before launch.\n\n## What changed\n\nA clearer section on your data.',
  'I have read and accept the terms of use (version 2.0).', array['A clearer section on your data.']);
select seed.act_as(null);
-- Everyone else stays on the current version, so only Ada (and anyone signing in fresh) meets the gate.
update public.consents set version = '2.0' where kind = 'terms' and member_id <> '00000000-0000-4000-9000-0000000000a1';
