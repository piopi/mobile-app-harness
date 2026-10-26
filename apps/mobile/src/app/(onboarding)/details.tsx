import { onboardingDetails } from '@app/shared';
import type { InputRef } from '@app/ui';
import { Button, Card, CardContent, Field, Input, Progress, Screen, Stack, Text } from '@app/ui';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ONBOARDING } from '../../features/auth/copy';
import { setDraft, useDraft } from '../../features/onboarding/draft';
import { useSession } from '../../lib/session';

/**
 * Onboarding 1 / 2: the member's name, prefilled when Apple or Google shared one. PROJECT: add the fields your app
 * needs here (and to `profileUpdate` in @app/shared and `complete_onboarding` in the database).
 */
export default function Details() {
  const { email, nameHint } = useSession();
  const draft = useDraft();
  const [first, setFirst] = useState(draft.details?.first_name ?? nameHint?.first ?? '');
  const [last, setLast] = useState(draft.details?.last_name ?? nameHint?.last ?? '');
  const lastRef = useRef<InputRef>(null);

  const details = onboardingDetails.safeParse({ first_name: first, last_name: last });
  const next = () => {
    if (!details.success) return;
    setDraft({ details: details.data });
    router.push('/consent');
  };

  return (
    <Screen native testID="onboarding-details">
      <Text variant="title-1">{ONBOARDING.detailsTitle}</Text>
      <Progress step={1} of={2} label={ONBOARDING.detailsStep} testID="onboarding-progress" />
      {email ? (
        <Card>
          <CardContent>
            <Text variant="headline" testID="signed-in-as">
              {ONBOARDING.signedInAs(email)}
            </Text>
          </CardContent>
        </Card>
      ) : null}
      <Stack gap="lg">
        <Field label={ONBOARDING.firstName}>
          <Input value={first} onChangeText={setFirst} autoComplete="given-name" textContentType="givenName" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => lastRef.current?.focus()} accessibilityLabel={ONBOARDING.firstName} testID="first-name" />
        </Field>
        <Field label={ONBOARDING.lastName}>
          <Input ref={lastRef} value={last} onChangeText={setLast} autoComplete="family-name" textContentType="familyName" returnKeyType="done" onSubmitEditing={next} accessibilityLabel={ONBOARDING.lastName} testID="last-name" />
        </Field>
      </Stack>
      <Button block label={ONBOARDING.continue} trailing="→" disabled={!details.success} onPress={next} testID="details-continue" />
    </Screen>
  );
}
