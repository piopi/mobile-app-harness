-- sign-in: olly@app.test
-- Olly signed in for the first time and hasn't finished setup: no name, no consents. The onboarding gate opens.
select seed.add_member('00000000-0000-4000-8000-0000000000c4', '00000000-0000-4000-9000-0000000000c4', 'olly@app.test', null, null, onboarded => false, joined => now());
