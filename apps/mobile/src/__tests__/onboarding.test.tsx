import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import Consent from '../app/(onboarding)/consent';
import Details from '../app/(onboarding)/details';
import TermsReaccept from '../app/(onboarding)/terms';
import { resetDraft, setDraft } from '../features/onboarding/draft';
import { renderWithClient } from './support/render';
import { routeRpc, setTable, supabase } from './support/mock-supabase';

jest.mock('../lib/supabase', () => require('./support/mock-supabase'));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, Redirect: () => null }));
jest.mock('../lib/session', () => ({
  useSession: () => ({ email: 'olly@app.test', nameHint: { first: 'Olly', last: '' }, launch: null }),
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

describe('Onboarding 1 / 2: details', () => {
  it('prefills the name hint and continues once the name is complete', async () => {
    await renderWithClient(<Details />);
    expect(screen.getByTestId('signed-in-as')).toHaveTextContent('Signed in as olly@app.test');
    expect(screen.getByTestId('first-name').props.value).toBe('Olly');
    expect(screen.getByTestId('details-continue')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('last-name'), 'Onboard');
    await fireEvent.press(screen.getByTestId('details-continue'));
    expect(router.push).toHaveBeenCalledWith('/consent');
  });
});

describe('Onboarding 2 / 2: consent', () => {
  beforeEach(() => setDraft({ details: { first_name: 'Olly', last_name: 'Onboard' } }));

  it('needs 18+ and the current terms, then finishes setup in one call', async () => {
    await renderWithClient(<Consent />);
    expect(await screen.findByText('I have read and accept the terms of use (version 2.0).')).toBeTruthy();
    expect(screen.getByTestId('finish-setup')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('adult'));
    await fireEvent.press(screen.getByTestId('accept-terms'));
    await fireEvent.press(screen.getByTestId('finish-setup'));
    await waitFor(() =>
      expect(supabase.rpc).toHaveBeenCalledWith('complete_onboarding', { first_name: 'Olly', last_name: 'Onboard', terms_version: '2.0', adult: true, marketing: false }),
    );
  });

  it('says when the details could not be saved', async () => {
    routeRpc(() => ({ data: null, error: { message: 'terms_version_mismatch' } }));
    await renderWithClient(<Consent />);
    await screen.findByTestId('accept-terms');
    await fireEvent.press(screen.getByTestId('adult'));
    await fireEvent.press(screen.getByTestId('accept-terms'));
    await fireEvent.press(screen.getByTestId('finish-setup'));
    expect(await screen.findByTestId('finish-error')).toHaveTextContent('We could not save your details. Try again.');
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
