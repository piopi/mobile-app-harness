import { otpCode, signInEmail } from '@app/shared';
import { supabase } from '../supabase';

/**
 * Email one-time code (Supabase Auth). One flow for new and returning members: `shouldCreateUser` makes the
 * first code also create the account (and the member row, through the auth trigger). Locally the code lands in
 * this stack's Mailpit (`MAILPIT_URL`), in the subject.
 */
export async function sendEmailCode(rawEmail: string) {
  const email = signInEmail.parse(rawEmail);
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
  return email;
}

export async function verifyEmailCode(email: string, rawCode: string) {
  const token = otpCode.parse(rawCode);
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  return data.session;
}
