import { proseBlocks } from '@app/shared';
import { Button, IconTile, Prose, Screen, Stack, Text } from '@app/ui';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ONBOARDING, TERMS } from '../features/auth/copy';
import { useCurrentTerms } from '../features/onboarding/queries';

/** The full terms (a native modal over onboarding or the re-accept gate): the version, the text, Close. */
export default function TermsText() {
  const terms = useCurrentTerms();
  const blocks = useMemo(() => (terms.data ? proseBlocks(terms.data.body) : []), [terms.data]);
  return (
    <Screen native testID="terms-text">
      {terms.data ? (
        <>
          <Stack gap="md">
            <IconTile icon="shield" />
            <Text variant="title-2">{ONBOARDING.termsTitle(terms.data.version)}</Text>
          </Stack>
          <Prose blocks={blocks} />
          <Button block variant="secondary" label={TERMS.close} onPress={() => router.back()} testID="terms-text-close" />
        </>
      ) : null}
    </Screen>
  );
}
