import { ListRow, Screen, SectionHeader, Stack, Text } from '@app/ui';
import { useState } from 'react';
import { AuthForm } from '../../features/auth/auth-form';
import { AUTH_HERO, authErrorCopy } from '../../features/auth/copy';
import { useAgentState } from '../../dev/agent-events';
import { DEV_ACCOUNTS, devSignIn } from '../../lib/auth/dev-accounts';
import { providerModes, STAND_IN, type Provider } from '../../lib/auth/providers';

/** Sign in. Dev builds add the stand-ins note and the seeded accounts (one tap each). */
export default function SignIn() {
  return (
    <Screen native testID="sign-in-screen">
      <Stack gap="xs">
        <Text variant="title-1" testID="hero-title">
          {AUTH_HERO['sign-in'].title}
        </Text>
        <Text variant="body" tone="muted">
          {AUTH_HERO['sign-in'].line}
        </Text>
      </Stack>
      <AuthForm mode="sign-in" />
      {__DEV__ ? <DevAccounts /> : null}
    </Screen>
  );
}

/** Dev builds only: how Apple and Google sign in locally, and every seeded account one tap away. */
function DevAccounts() {
  const { demo } = useAgentState();
  const [error, setError] = useState<string | null>(null);
  if (demo) return null;
  const standIns = (Object.keys(providerModes) as Provider[]).filter((p) => providerModes[p] === 'stand-in');
  return (
    <Stack gap="none" testID="dev-accounts">
      <SectionHeader title="Dev build" size="sm" />
      {standIns.length ? (
        <Text variant="callout" tone="muted">
          {`${standIns.map((p) => (p === 'apple' ? 'Apple' : 'Google')).join(' and ')} sign in as local stand-ins (${standIns.map((p) => STAND_IN[p].email).join(', ')}). Email codes land in this stack's Mailpit (MAILPIT_URL in .env.local).`}
        </Text>
      ) : null}
      {error ? (
        <Text variant="callout" tone="danger">
          {error}
        </Text>
      ) : null}
      {DEV_ACCOUNTS.map((a) => (
        <ListRow key={a.email} title={a.email} subtitle={a.who} density="compact" arrow onPress={() => devSignIn(a.email).catch((e: unknown) => setError(authErrorCopy(e)))} testID={`dev-account-${a.email}`} />
      ))}
    </Stack>
  );
}
