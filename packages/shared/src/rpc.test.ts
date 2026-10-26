import { describe, expect, it } from 'vitest';
import { itemPatch, launchStatus, parseRpcInput, rpcErrorCode, rpcInputs } from './rpc';

describe('RPC input schemas', () => {
  it('has a strict empty schema for no-argument RPCs', () => {
    expect(() => rpcInputs.launch_status.parse({ extra: 1 })).toThrow();
  });
  it('validates onboarding', () => {
    expect(parseRpcInput('complete_onboarding', { first_name: 'Ada', last_name: 'L', terms_version: '1.0', adult: true })).toMatchObject({ adult: true });
    expect(() => parseRpcInput('complete_onboarding', { first_name: 'Ada', last_name: 'L', terms_version: '1.0', adult: false })).toThrow();
  });
  it('takes strict patches for admin edits (absent keeps, null clears)', () => {
    expect(itemPatch.parse({ summary: null })).toEqual({ summary: null });
    expect(() => itemPatch.parse({ colour: 'red' })).toThrow();
  });
  it('never grants the implicit member role', () => {
    expect(() => parseRpcInput('grant_role', { member_id: '00000000-0000-4000-9000-0000000000a1', role: 'member' })).toThrow();
  });
});

describe('RPC results and errors', () => {
  it('maps error codes', () => {
    expect(rpcErrorCode({ message: 'terms_required' })).toBe('terms_required');
    expect(rpcErrorCode({ message: 'Some database error' })).toBeNull();
  });
  it('parses launch status', () => {
    expect(launchStatus.parse({ mode: 'terms', terms: { current_version: '2.0', accepted_version: '1.0', changes: [] } }).mode).toBe('terms');
  });
});
