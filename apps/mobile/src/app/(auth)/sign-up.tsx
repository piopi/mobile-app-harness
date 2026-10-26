import { Screen, Stack, Text } from '@app/ui';
import { AuthForm } from '../../features/auth/auth-form';
import { AUTH_HERO } from '../../features/auth/copy';

/** Create an account: the same form as sign-in (a first code creates the account), with its own copy. */
export default function SignUp() {
  return (
    <Screen native testID="sign-up-screen">
      <Stack gap="xs">
        <Text variant="title-1" testID="hero-title">
          {AUTH_HERO['sign-up'].title}
        </Text>
        <Text variant="body" tone="muted">
          {AUTH_HERO['sign-up'].line}
        </Text>
      </Stack>
      <AuthForm mode="sign-up" />
    </Screen>
  );
}
