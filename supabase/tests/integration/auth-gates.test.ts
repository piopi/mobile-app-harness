// The account gates over the real API: sign-up creates a member, onboarding and terms move the gate, holds stop
// every member RPC. Runs against this worktree's stack (`pnpm test:integration`).
import { describe, expect, it } from 'vitest';
import { asRole, db, expectForbidden, expectOk, expectRpcError, IDS, newAccount, useScenario } from './helpers';

useScenario('base');

const currentTerms = async () => (await db.one<{ version: string }>('select version from public.terms_versions where is_current')).version;

describe('launch_status', () => {
  it('is signed_out without a session', async () => {
    const anon = await asRole('anon');
    const { data } = expectOk(await anon.rpc('launch_status'));
    expect(data).toEqual({ mode: 'signed_out' });
  });

  it('opens onboarding for a brand-new account, then the app once it is complete', async () => {
    const { client } = await newAccount('gates');
    const first = expectOk(await client.rpc('launch_status')).data as { mode: string };
    expect(first.mode).toBe('onboarding');
    expectRpcError(await client.rpc('complete_onboarding', { display_name: 'New Person', terms_version: '0.0' }), 'terms_version_mismatch');
    const done = expectOk(await client.rpc('complete_onboarding', { display_name: 'New Person', terms_version: await currentTerms(), about: 'Example field.' }));
    expect((done.data as { mode: string }).mode).toBe('member');
  });

  it('gives a member their roles', async () => {
    const staff = await asRole('staff');
    const { data } = expectOk(await staff.rpc('launch_status'));
    expect(data).toMatchObject({ mode: 'member', roles: ['member', 'staff'], is_staff: true, is_admin: false });
  });
});

describe('holds', () => {
  it('a suspended member is held and refused', async () => {
    const { client } = await newAccount('held');
    expectOk(await client.rpc('complete_onboarding', { display_name: 'Held Person', terms_version: await currentTerms() }));
    await db.query(`update public.members set status = 'suspended' where email like 'held-%'`);
    const { data } = expectOk(await client.rpc('launch_status'));
    expect((data as { mode: string }).mode).toBe('suspended');
    expectForbidden(await client.rpc('accept_terms', { version: await currentTerms() }), 'suspended');
  });
});

describe('roles', () => {
  it('only admins grant roles, and an admin cannot drop their own admin role', async () => {
    const member = await asRole('member');
    expectForbidden(await member.rpc('grant_role', { member_id: IDS.member2, role: 'staff' }), 'admin_only');
    const admin = await asRole('admin');
    expectOk(await admin.rpc('grant_role', { member_id: IDS.member2, role: 'staff' }));
    expectOk(await admin.rpc('revoke_role', { member_id: IDS.member2, role: 'staff' }));
    expectRpcError(await admin.rpc('revoke_role', { member_id: IDS.admin, role: 'admin' }), 'cannot_revoke_own_admin');
  });
});
