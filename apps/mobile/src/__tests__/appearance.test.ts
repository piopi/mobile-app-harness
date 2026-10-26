const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
}));

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
  jest.resetModules();
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('appearance', () => {
  it('is dark on first launch', async () => {
    const { initAppearance } = require('../lib/appearance') as typeof import('../lib/appearance');
    const { Uniwind } = require('uniwind') as typeof import('uniwind');
    initAppearance();
    await flush();
    expect(Uniwind.setTheme).toHaveBeenCalledWith('dark');
    expect(Uniwind.setTheme).toHaveBeenCalledTimes(1);
  });

  it('keeps a member’s choice for the next launch', async () => {
    const { initAppearance, setAppearance } = require('../lib/appearance') as typeof import('../lib/appearance');
    const { Uniwind } = require('uniwind') as typeof import('uniwind');
    setAppearance('light');
    await flush();
    expect(mockStore.get('appearance')).toBe('light');
    jest.clearAllMocks();
    initAppearance();
    await flush();
    expect(Uniwind.setTheme).toHaveBeenNthCalledWith(1, 'dark');
    expect(Uniwind.setTheme).toHaveBeenLastCalledWith('light');
  });
});
