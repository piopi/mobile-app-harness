import { onboardingProfile } from '@app/shared';
import type { InputRef } from '@app/ui';
import { Button, Card, CardContent, Field, Input, Progress, Screen, Stack, Text } from '@app/ui';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ONBOARDING } from '../../features/auth/copy';
import { setDraft, useDraft } from '../../features/onboarding/draft';
import { useSession } from '../../lib/session';

/**
 * Onboarding 1 / 2: the profile. A display name (prefilled when Apple or Google shared one) and the EXAMPLE
 * optional "about you" field. PROJECT: replace the example with the fields your app needs; the recipe (a column,
 * the zod schema, this form, the complete_onboarding argument, the launch_status check) is in the db-change skill.
 */
export default function Profile() {
  const { email, nameHint } = useSession();
  const draft = useDraft();
  const [name, setName] = useState(draft.profile?.display_name ?? nameHint ?? '');
  const [about, setAbout] = useState(draft.profile?.about ?? '');
  const aboutRef = useRef<InputRef>(null);

  const profile = onboardingProfile.safeParse({ display_name: name, about: about.trim() ? about : undefined });
  const next = () => {
    if (!profile.success) return;
    setDraft({ profile: profile.data });
    router.push('/consent');
  };

  return (
    <Screen native testID="onboarding-profile">
      <Text variant="title-1">{ONBOARDING.profileTitle}</Text>
      <Progress step={1} of={2} label={ONBOARDING.profileStep} testID="onboarding-progress" />
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
        <Field label={ONBOARDING.displayName} hint={ONBOARDING.displayNameHint}>
          <Input value={name} onChangeText={setName} autoComplete="name" textContentType="name" returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => aboutRef.current?.focus()} accessibilityLabel={ONBOARDING.displayName} testID="display-name" />
        </Field>
        {/* EXAMPLE field: replace or delete it (see the comment above). */}
        <Field label={ONBOARDING.about} hint={ONBOARDING.aboutHint}>
          <Input ref={aboutRef} kind="multiline" value={about} onChangeText={setAbout} maxLength={280} accessibilityLabel={ONBOARDING.about} testID="about" />
        </Field>
      </Stack>
      <Button block label={ONBOARDING.continue} trailing="→" disabled={!profile.success} onPress={next} testID="profile-continue" />
    </Screen>
  );
}
