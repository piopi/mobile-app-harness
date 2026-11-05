import { fireEvent, screen } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import Me from '../app/(tabs)/me';
import { env } from '../lib/env';
import { renderWithClient } from './support/render';

jest.mock('../lib/supabase', () => require('./support/mock-supabase'));
jest.mock('../lib/session', () => ({ useSession: () => ({ launch: { display_name: 'Jordan' }, email: 'member@app.test', roles: ['member'] }) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-linking', () => ({ openURL: jest.fn(() => Promise.resolve(true)) }));
jest.mock('../lib/env', () => ({ env: { guidesUrl: '' } }));

beforeEach(() => jest.clearAllMocks());

describe('Me: Help', () => {
  it('hides Help while no guides site is set', async () => {
    env.guidesUrl = '';
    await renderWithClient(<Me />);
    expect(screen.getByTestId('me-screen')).toBeTruthy();
    expect(screen.queryByTestId('me-help')).toBeNull();
  });

  it('opens the guides site', async () => {
    env.guidesUrl = 'http://127.0.0.1:8301/';
    await renderWithClient(<Me />);
    await fireEvent.press(screen.getByTestId('me-help'));
    expect(Linking.openURL).toHaveBeenCalledWith('http://127.0.0.1:8301/');
  });
});
