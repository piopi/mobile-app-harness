import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Consent from '../app/(onboarding)/consent';
import Profile from '../app/(onboarding)/profile';
import TermsReaccept from '../app/(onboarding)/terms';
import { resetDraft, setDraft } from '../features/onboarding/draft';
import { renderWithClient } from './support/render';
import { routeRpc, setTable, supabase } from './support/mock-supabase';

jest.mock('../lib/supabase', () => require('./support/mock-supabase'));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, Redirect: () => null }));
jest.mock('../lib/session', () => ({
  useSession: () => ({ email: 'new@app.test', nameHint: null, launch: null }),
  refreshLaunchStatus: jest.fn(async () => {}),
  signOut: jest.fn(),
}));

const TERMS = {
  version: '2.0',
  title: 'Terms of use',
  body: '# Terms of use\n\n**Version 2.0.**\n\n## Using the app\n\nBe kind.',
  accept_label: 'I have read and accept the terms of use (version 2.0).',
  changes: [] as string[],
  published_at: '2026-09-01T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  resetDraft();
  routeRpc();
  setTable('terms_versions', TERMS);
});

describe('Onboarding 1 / 2: profile', () => {
  it('needs a display name; the example about field is optional', async () => {
    await renderWithClient(<Profile />);
    expect(screen.getByTestId('signed-in-as')).toHaveTextContent('Signed in as new@app.test');
    expect(screen.getByTestId('profile-continue')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('display-name'), 'Jordan');
    await fireEvent.press(screen.getByTestId('profile-continue'));
    expect(router.push).toHaveBeenCalledWith('/consent');
  });
});

describe('Onboarding 2 / 2: consent', () => {
  beforeEach(() => setDraft({ profile: { display_name: 'Jordan', about: 'Example.' } }));

  it('needs the current terms, then finishes setup in one call', async () => {
    await renderWithClient(<Consent />);
    expect(await screen.findByText('I have read and accept the terms of use (version 2.0).')).toBeTruthy();
    expect(screen.getByTestId('finish-setup')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('accept-terms'));
    await fireEvent.press(screen.getByTestId('finish-setup'));
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('complete_onboarding', { display_name: 'Jordan', about: 'Example.', terms_version: '2.0', marketing: false }),
    );
  });

  it('says when the profile could not be saved', async () => {
    routeRpc(() => ({ data: null, error: { message: 'terms_version_mismatch' } }));
    await renderWithClient(<Consent />);
    await screen.findByTestId('accept-terms');
    await fireEvent.press(screen.getByTestId('accept-terms'));
    await fireEvent.press(screen.getByTestId('finish-setup'));
    expect(await screen.findByTestId('finish-error')).toHaveTextContent('We could not save your profile. Try again.');
  });
});

describe('Terms re-accept', () => {
  it('lists what changed and accepts the current version', async () => {
    setTable('terms_versions', { ...TERMS, changes: ['A clearer data section.'] });
    await renderWithClient(<TermsReaccept />);
    expect(await screen.findByText('· A clearer data section.')).toBeTruthy();
    expect(screen.getByTestId('terms-accept')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('accept-terms'));
    await fireEvent.press(screen.getByTestId('terms-accept'));
    await waitFor(() => expect(supabase.rpc).toHaveBeenCalledWith('accept_terms', { version: '2.0' }));
  });
});
