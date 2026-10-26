import { fireEvent, screen } from '@testing-library/react-native';
import Suspended from '../app/suspended';
import { renderWithClient } from './support/render';
import { supabase } from './support/mock-supabase';

jest.mock('../lib/supabase', () => require('./support/mock-supabase'));
jest.mock('../lib/session', () => ({
  useSession: () => ({ launch: { mode: 'suspended', contact_email: 'hello@app.test' } }),
  signOut: () => require('./support/mock-supabase').supabase.auth.signOut(),
}));

beforeEach(() => jest.clearAllMocks());

describe('Hold screens', () => {
  it('suspended: the copy, the contact email, and sign out after a confirm', async () => {
    await renderWithClient(<Suspended />);
    expect(screen.getByText('This account isn’t active.')).toBeTruthy();
    expect(screen.getByTestId('hold-contact')).toHaveTextContent('Contact: hello@app.test');
    await fireEvent.press(screen.getByTestId('sign-out'));
    await fireEvent.press(await screen.findByTestId('confirm-sign-out'));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
