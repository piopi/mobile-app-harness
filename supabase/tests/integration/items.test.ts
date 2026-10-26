// The list + detail catalogue: what each role reads, and the admin patch contract.
import { describe, expect, it } from 'vitest';
import { asRole, expectForbidden, expectOk, expectRpcError, useScenario } from './helpers';

useScenario('base');

describe('items', () => {
  it('members read published items only; staff read drafts too', async () => {
    const member = await asRole('member');
    const { data: mine } = expectOk(await member.from('items').select('title, status'));
    expect(mine!.length).toBeGreaterThan(0);
    expect(mine!.every((i) => i.status === 'published')).toBe(true);
    const staff = await asRole('staff');
    const { data: all } = expectOk(await staff.from('items').select('status'));
    expect(all!.some((i) => i.status === 'draft')).toBe(true);
  });

  it('only admins create and edit, through RPCs with a strict patch', async () => {
    const member = await asRole('member');
    expectForbidden(await member.rpc('create_item', { title: 'Nope' }), 'admin_only');
    const { error } = await member.from('items').insert({ title: 'Direct' });
    expect(error).not.toBeNull();

    const admin = await asRole('admin');
    const created = expectOk(await admin.rpc('create_item', { title: 'From the test', summary: 'S' }));
    const id = (created.data as { id: string }).id;
    expectRpcError(await admin.rpc('update_item', { item_id: id, patch: { colour: 'red' } }), 'invalid_patch');
    const updated = expectOk(await admin.rpc('update_item', { item_id: id, patch: { status: 'published', summary: null } }));
    expect(updated.data).toMatchObject({ status: 'published', summary: null });
  });
});
