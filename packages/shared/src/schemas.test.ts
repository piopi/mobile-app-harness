import { describe, expect, it } from 'vitest';
import { isStaff, item, member, shortName } from './schemas';

describe('schemas', () => {
  it('parses a member row and rejects an unknown status', () => {
    const row = { id: '00000000-0000-4000-9000-0000000000a1', email: 'ada@app.test', first_name: 'Ada', last_name: 'Lovelace', status: 'active', onboarding_completed_at: null, created_at: '2026-01-01T00:00:00Z' };
    expect(member.parse(row).first_name).toBe('Ada');
    expect(() => member.parse({ ...row, status: 'deleted' })).toThrow();
  });
  it('parses an item', () => {
    expect(item.parse({ id: '00000000-0000-4000-9000-0000000000a1', title: 'T', summary: null, body: null, status: 'published', sort: 0, published_at: null }).title).toBe('T');
  });
  it('knows staff and short names', () => {
    expect(isStaff(['member', 'admin'])).toBe(true);
    expect(isStaff('member')).toBe(false);
    expect(shortName('Ada', 'Lovelace')).toBe('Ada L.');
    expect(shortName(null, null)).toBe('Member');
  });
});
