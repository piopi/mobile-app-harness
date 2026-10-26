-- sign-in: new@app.test
-- A first sign-in that hasn't finished onboarding: no display name, no consents. The onboarding gate opens.
select seed.add_member('00000000-0000-4000-8000-0000000000c4', '00000000-0000-4000-9000-0000000000c4', 'new@app.test', null, onboarded => false, joined => now());
