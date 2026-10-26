import { getAgentState, resetAgentStateForTests } from '../dev/agent-events';
import { setLastPathname } from '../dev/last-pathname';
import { redirectSystemPath } from '../app/+native-intent';

beforeEach(() => resetAgentStateForTests());

describe('redirectSystemPath', () => {
  it('handles an agent link and stays on the current screen', () => {
    setLastPathname('/storybook');
    expect(redirectSystemPath({ path: 'exampleapp://__agent/offline', initial: false })).toBe('/storybook');
    expect(getAgentState().offline).toBe(true);
  });

  it('sends a cold-start agent link home', () => {
    expect(redirectSystemPath({ path: 'exampleapp://__agent/online', initial: true })).toBe('/');
  });

  it('maps a storybook link to the single-story route', () => {
    expect(redirectSystemPath({ path: 'exampleapp://__storybook/ui-button--variants', initial: false })).toBe(
      '/storybook?story=ui-button--variants',
    );
  });

  it('passes other links through', () => {
    expect(redirectSystemPath({ path: 'exampleapp://items', initial: false })).toBe('exampleapp://items');
  });
});
