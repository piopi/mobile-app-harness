import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import SignIn from '../app/(auth)/sign-in';
import SignUp from '../app/(auth)/sign-up';
import Verify from '../app/(auth)/verify';
import Welcome from '../app/(auth)/welcome';
import { renderWithClient } from './support/render';
import { routeRpc, supabase } from './support/mock-supabase';

jest.mock('../lib/supabase', () => require('./support/mock-supabase'));
jest.mock('expo-apple-authentication', () => ({ signInAsync: jest.fn(), AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 } }));
jest.mock('@react-native-google-signin/google-signin', () => ({ GoogleSignin: { configure: jest.fn(), signIn: jest.fn(), hasPlayServices: jest.fn() }, isSuccessResponse: jest.fn() }));
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
  useNavigation: () => ({ addListener: () => () => {} }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  routeRpc();
});

describe('Landing', () => {
  it('shows the copy and both ways in', async () => {
    await renderWithClient(<Welcome />);
    expect(screen.getByTestId('landing-line')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('landing-join'));
    expect(router.push).toHaveBeenCalledWith('/sign-up');
    await fireEvent.press(screen.getByTestId('landing-sign-in'));
    expect(router.push).toHaveBeenCalledWith('/sign-in');
  });
});

describe('Sign in and sign up', () => {
  it('shows the sign-in copy, the providers and the seeded accounts in dev', async () => {
    await renderWithClient(<SignIn />);
    expect(screen.getByText('Welcome back.')).toBeTruthy();
    expect(screen.getByText('We’ll email you a 6-digit code. No password needed.')).toBeTruthy();
    expect(screen.getByTestId('sign-in-apple')).toBeTruthy();
    expect(screen.getByText('New here?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('switch-to-sign-up'));
    expect(router.replace).toHaveBeenCalledWith('/sign-up');
    await fireEvent.press(screen.getByTestId('dev-account-staff@app.test'));
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'staff@app.test', password: 'password123' });
  });

  it('shows the sign-up copy', async () => {
    await renderWithClient(<SignUp />);
    expect(screen.getByText('Create your account.')).toBeTruthy();
    expect(screen.getByText('Already have an account?')).toBeTruthy();
  });

  it('asks for a valid address, then sends a code and moves to the code step', async () => {
    await renderWithClient(<SignIn />);
    await fireEvent.changeText(screen.getByTestId('email-input'), 'ada');
    await fireEvent.press(screen.getByTestId('email-submit'));
    expect(screen.getByTestId('email-field-error')).toHaveTextContent('Enter a valid email address.');
    await fireEvent.changeText(screen.getByTestId('email-input'), ' Ada@app.TEST ');
    await fireEvent.press(screen.getByTestId('email-submit'));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: '/verify', params: expect.objectContaining({ email: 'ada@app.test', mode: 'sign-in', notice: 'sent' }) }));
  });

  it('goes to the code step anyway when codes are limited for that address', async () => {
    supabase.auth.signInWithOtp.mockResolvedValueOnce({ data: null, error: { code: 'over_email_send_rate_limit' } });
    await renderWithClient(<SignUp />);
    await fireEvent.changeText(screen.getByTestId('email-input'), 'ada@app.test');
    await fireEvent.press(screen.getByTestId('email-submit'));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith({ pathname: '/verify', params: expect.objectContaining({ notice: 'limit', mode: 'sign-up' }) }));
  });

  it('signs the Google stand-in up the first time', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: null, error: { code: 'invalid_credentials' } });
    await renderWithClient(<SignIn />);
    await fireEvent.press(screen.getByTestId('sign-in-google'));
    await waitFor(() => expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'google.member@app.test' })));
  });
});

describe('Code step', () => {
  beforeEach(() => {
    mockParams = { email: 'ada@app.test', mode: 'sign-in', notice: 'sent', sentAt: String(Date.now()) };
  });

  it('says where the code went and submits itself at six digits', async () => {
    await renderWithClient(<Verify />);
    expect(screen.getByTestId('verify-notice')).toHaveTextContent('We sent a 6-digit code to ada@app.test. It expires in 10 minutes.');
    expect(screen.getByTestId('resend-countdown')).toHaveTextContent(/New code in 0:(30|29)/);
    await fireEvent.changeText(screen.getByTestId('code-input'), '123 456');
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ email: 'ada@app.test', token: '123456', type: 'email' });
  });

  it('says when a code is wrong or too short', async () => {
    supabase.auth.verifyOtp.mockResolvedValueOnce({ data: { session: null }, error: { code: 'otp_expired' } });
    await renderWithClient(<Verify />);
    await fireEvent.press(screen.getByTestId('code-submit'));
    expect(screen.getByTestId('code-field-error')).toHaveTextContent('Enter the 6-digit code from the email.');
    await fireEvent.changeText(screen.getByTestId('code-input'), '000000');
    await waitFor(() => expect(screen.getByTestId('code-field-error')).toHaveTextContent('That code isn’t right. Check the email and try again.'));
  });

  it('uses the sign-up copy and offers a new code after the wait', async () => {
    jest.useFakeTimers();
    mockParams = { email: 'ada@app.test', mode: 'sign-up', notice: 'limit', sentAt: String(Date.now() - 31_000) };
    await renderWithClient(<Verify />);
    expect(screen.getByTestId('verify-notice')).toHaveTextContent('We can’t send another code to ada@app.test right now. Use the last code we sent.');
    expect(screen.getByText('Create account')).toBeTruthy();
    await act(() => jest.advanceTimersByTime(1000));
    await fireEvent.press(screen.getByTestId('resend-code'));
    expect(supabase.auth.signInWithOtp).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
