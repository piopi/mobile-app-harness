import { signInEmail } from '@app/shared';
import { Button, Divider, Field, Input, Stack, Text } from '@app/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { sendEmailCode } from '../../lib/auth/email';
import { providerModes, SignInCancelled, signInWith, type Provider } from '../../lib/auth/providers';
import { AUTH_FORM, authErrorCopy, isEmailLimit, PROVIDER_ERROR, type AuthMode } from './copy';

/**
 * The sign-in form, start step: Apple, Google, "or", the email field and "Email me a code". Sign-in and sign-up
 * are one flow; a first code creates the account. Errors sit by what they belong to.
 */
export function AuthForm({ mode }: { mode: AuthMode }) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [pending, setPending] = useState<Provider | 'send' | null>(null);
  const busy = pending !== null;

  const provider = async (p: Provider) => {
    setProviderError(null);
    setPending(p);
    try {
      await signInWith(p);
    } catch (e) {
      if (!(e instanceof SignInCancelled)) setProviderError(PROVIDER_ERROR[p]);
    } finally {
      setPending(null);
    }
  };

  const requestCode = async () => {
    const parsed = signInEmail.safeParse(email);
    if (!parsed.success) {
      setEmailError(AUTH_FORM.invalidEmail);
      return;
    }
    setEmailError(null);
    setPending('send');
    try {
      await sendEmailCode(parsed.data);
      router.push({ pathname: '/verify', params: { email: parsed.data, mode, notice: 'sent', sentAt: String(Date.now()) } });
    } catch (e) {
      // Earlier codes may already be in the inbox: go to the code step anyway.
      if (isEmailLimit(e)) router.push({ pathname: '/verify', params: { email: parsed.data, mode, notice: 'limit', sentAt: String(Date.now()) } });
      else setEmailError(authErrorCopy(e));
    } finally {
      setPending(null);
    }
  };

  return (
    <Stack gap="md" testID="auth-form">
      <Stack gap="sm">
        {providerModes.apple !== 'off' ? (
          <Button block icon="apple" label={pending === 'apple' ? AUTH_FORM.applePending : AUTH_FORM.apple} disabled={busy} onPress={() => void provider('apple')} testID="sign-in-apple" />
        ) : null}
        {providerModes.google !== 'off' ? (
          <Button block icon="google" label={pending === 'google' ? AUTH_FORM.googlePending : AUTH_FORM.google} disabled={busy} onPress={() => void provider('google')} testID="sign-in-google" />
        ) : null}
        {providerError ? (
          <Text variant="callout" tone="danger" accessibilityLiveRegion="polite" testID="provider-error">
            {providerError}
          </Text>
        ) : null}
      </Stack>
      <Divider label={AUTH_FORM.or} />
      <Field label={AUTH_FORM.emailLabel} hint={AUTH_FORM.emailHint} error={emailError} testID="email-field">
        <Input
          value={email}
          onChangeText={setEmail}
          state={emailError ? 'error' : undefined}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={() => void requestCode()}
          accessibilityLabel={AUTH_FORM.emailLabel}
          testID="email-input"
        />
      </Field>
      <Button block variant="secondary" label={pending === 'send' ? AUTH_FORM.sending : AUTH_FORM.sendCode} disabled={busy} onPress={() => void requestCode()} testID="email-submit" />
      <AuthSwitch mode={mode} />
    </Stack>
  );
}

/** "New here? Create an account" / "Already have an account? Sign in". */
export function AuthSwitch({ mode }: { mode: AuthMode }) {
  return (
    <Stack direction="row" gap="sm" align="center" wrap>
      <Text variant="callout">{AUTH_FORM.switchPrompt[mode]}</Text>
      <Button
        variant="link"
        label={AUTH_FORM.switchLink[mode]}
        onPress={() => router.replace(mode === 'sign-in' ? '/sign-up' : '/sign-in')}
        testID={`switch-to-${mode === 'sign-in' ? 'sign-up' : 'sign-in'}`}
      />
    </Stack>
  );
}
