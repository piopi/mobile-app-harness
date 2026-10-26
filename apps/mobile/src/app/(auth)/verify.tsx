import { formatCountdown, normaliseOtp, OTP_LENGTH, resendSecondsLeft } from '@app/shared';
import type { InputRef } from '@app/ui';
import { Button, Field, Input, Screen, Stack, Text } from '@app/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AuthSwitch } from '../../features/auth/auth-form';
import { AUTH_FORM, authErrorCopy, isEmailLimit, type AuthMode } from '../../features/auth/copy';
import { useFocusAfterTransition } from '../../features/auth/use-focus-after-transition';
import { sendEmailCode, verifyEmailCode } from '../../lib/auth/email';
import { now } from '../../lib/clock';

/**
 * The code step: the 6-digit code, expiring in 10 minutes, a new code
 * after 30 s, and a way back to fix the address. On success the session changes and the root gate moves on.
 * It submits itself at six digits (an iOS/Android code autofill fills all six at once).
 */
export default function Verify() {
  const params = useLocalSearchParams<{ email: string; mode?: AuthMode; notice?: 'sent' | 'limit'; sentAt?: string }>();
  const email = params.email ?? '';
  const mode: AuthMode = params.mode === 'sign-up' ? 'sign-up' : 'sign-in';
  const [notice, setNotice] = useState(params.notice === 'limit' ? AUTH_FORM.limit(email) : AUTH_FORM.sent(email));
  const [sentAt, setSentAt] = useState(() => Number(params.sentAt) || now().getTime());
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<'verify' | 'send' | null>(null);
  const [tick, setTick] = useState(() => now().getTime());
  const submitted = useRef<string | null>(null);
  const inputRef = useRef<InputRef>(null);
  useFocusAfterTransition(inputRef);

  useEffect(() => {
    const id = setInterval(() => setTick(now().getTime()), 1000);
    return () => clearInterval(id);
  }, []);
  const wait = resendSecondsLeft(sentAt, tick);

  const verify = async (value: string) => {
    if (value.length !== OTP_LENGTH) {
      setError(AUTH_FORM.codeLength);
      return;
    }
    if (submitted.current === value) return;
    submitted.current = value;
    setPending('verify');
    setError(null);
    try {
      await verifyEmailCode(email, value);
    } catch (e) {
      setError(authErrorCopy(e));
      setPending(null);
      submitted.current = null;
    }
  };

  const resend = async () => {
    setError(null);
    setPending('send');
    try {
      await sendEmailCode(email);
      setNotice(AUTH_FORM.sent(email));
    } catch (e) {
      if (isEmailLimit(e)) setNotice(AUTH_FORM.limit(email));
      else setError(authErrorCopy(e));
    } finally {
      setSentAt(now().getTime());
      setCode('');
      submitted.current = null;
      setPending(null);
    }
  };

  return (
    <Screen native testID="verify-screen">
      <Stack gap="lg">
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="title-3">{AUTH_FORM.checkEmail}</Text>
            <Text variant="callout" tone="muted" testID="verify-notice">
              {notice}
            </Text>
          </Stack>
          <Field label={AUTH_FORM.codeLabel} error={error} testID="code-field">
            <Input
              ref={inputRef}
              kind="code"
              value={code}
              onChangeText={(v) => {
                const next = normaliseOtp(v);
                setCode(next);
                if (error) setError(null);
                if (next.length === OTP_LENGTH) void verify(next);
              }}
              state={error ? 'error' : undefined}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={OTP_LENGTH + 1}
              accessibilityLabel={AUTH_FORM.codeLabel}
              testID="code-input"
            />
          </Field>
          <Button block label={pending === 'verify' ? AUTH_FORM.checking : AUTH_FORM.submit[mode]} disabled={pending !== null} onPress={() => void verify(code)} testID="code-submit" />
          <Stack direction="row" justify="between" align="center">
            {wait > 0 ? (
              <Text variant="label" tone="muted" testID="resend-countdown">
                {`${AUTH_FORM.newCodeIn} ${formatCountdown(wait)}`}
              </Text>
            ) : (
              <Button variant="link" label={pending === 'send' ? AUTH_FORM.sending : AUTH_FORM.sendNewCode} disabled={pending !== null} onPress={() => void resend()} testID="resend-code" />
            )}
            <Button variant="link" label={AUTH_FORM.differentEmail} disabled={pending !== null} onPress={() => router.back()} testID="change-email" />
          </Stack>
          <AuthSwitch mode={mode} />
        </Stack>
      </Stack>
    </Screen>
  );
}
