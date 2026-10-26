import { describe, expect, it } from 'vitest';
import { displayName, isStaff, item, member } from './schemas';

describe('schemas', () => {
  it('parses a member row and rejects an unknown status', () => {
    const row = { id: '00000000-0000-4000-9000-0000000000a1', email: 'member@app.test', display_name: 'Jordan', about: null, status: 'active', onboarded_at: null, created_at: '2026-01-01T00:00:00Z' };
    expect(member.parse(row).display_name).toBe('Jordan');
    expect(() => member.parse({ ...row, status: 'deleted' })).toThrow();
  });
  it('parses an item', () => {
    expect(item.parse({ id: '00000000-0000-4000-9000-0000000000a1', title: 'T', summary: null, body: null, status: 'published', sort: 0, published_at: null }).title).toBe('T');
  });
  it('knows staff and display names', () => {
    expect(isStaff(['member', 'admin'])).toBe(true);
    expect(isStaff('member')).toBe(false);
    expect(displayName(' Jordan ')).toBe('Jordan');
    expect(displayName(null)).toBe('Member');
  });
});
