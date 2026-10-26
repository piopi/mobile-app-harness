import { CHUNK, secureStorage } from '../lib/secure-storage';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));

beforeEach(() => mockStore.clear());

describe('secure session storage', () => {
  it('round-trips a session larger than one secure value', async () => {
    const big = 'x'.repeat(CHUNK * 2 + 10);
    await secureStorage.setItem('sb-auth', big);
    expect(mockStore.get('sb-auth')).toBe('3');
    expect(await secureStorage.getItem('sb-auth')).toBe(big);
  });

  it('drops chunks a shorter value no longer needs', async () => {
    await secureStorage.setItem('sb-auth', 'y'.repeat(CHUNK * 3));
    await secureStorage.setItem('sb-auth', 'short');
    expect(await secureStorage.getItem('sb-auth')).toBe('short');
    expect(mockStore.has('sb-auth.1')).toBe(false);
    expect(mockStore.has('sb-auth.2')).toBe(false);
  });

  it('removes every chunk and reads null when empty', async () => {
    await secureStorage.setItem('sb-auth', 'z'.repeat(CHUNK + 1));
    await secureStorage.removeItem('sb-auth');
    expect(mockStore.size).toBe(0);
    expect(await secureStorage.getItem('sb-auth')).toBeNull();
  });
});
