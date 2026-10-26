// Every table, read by every role: who sees what without an RPC.
import { describe, expect, it } from 'vitest';
import { asRole, IDS, useScenario } from './helpers';

useScenario('base');

describe('row level security', () => {
  it('a member reads their own member row only; staff read everyone', async () => {
    const member = await asRole('member');
    const { data: mine } = await member.from('members').select('id');
    expect(mine!.map((m) => m.id)).toEqual([IDS.ada]);
    const staff = await asRole('staff');
    const { data: all } = await staff.from('members').select('id');
    expect(all!.length).toBeGreaterThanOrEqual(4);
  });

  it('anon reads the terms and nothing else', async () => {
    const anon = await asRole('anon');
    const { data: terms } = await anon.from('terms_versions').select('version').eq('is_current', true);
    expect(terms).toHaveLength(1);
    for (const table of ['members', 'items', 'consents', 'audit_log'] as const) {
      const { data } = await anon.from(table).select('*');
      expect(data ?? []).toEqual([]);
    }
  });

  it('the audit log is for admins', async () => {
    const staff = await asRole('staff');
    const { data } = await staff.from('audit_log').select('id');
    expect(data).toEqual([]);
  });
});
