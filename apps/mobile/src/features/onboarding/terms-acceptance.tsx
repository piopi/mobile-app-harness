import { proseBlocks, proseExcerpt, type TermsDocument } from '@app/shared';
import { Button, Checkbox, Prose, Stack, Text } from '@app/ui';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ONBOARDING } from '../auth/copy';

type TermsAcceptanceProps = {
  terms: TermsDocument;
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  /** Onboarding shows "Terms of use, version …" and the intro above the excerpt. */
  intro?: boolean;
};

/**
 * The opening of the terms and the acceptance line, both from the published version (terms_versions). The excerpt
 * is short; "Read the full text" opens the whole document in a native modal (no scroll inside a scroll).
 */
export function TermsAcceptance({ terms, accepted, onAcceptedChange, intro }: TermsAcceptanceProps) {
  const excerpt = useMemo(() => proseExcerpt(proseBlocks(terms.body), 3), [terms.body]);
  const open = () => router.push('/terms-text');
  return (
    <Stack gap="md" testID="terms-acceptance">
      {intro ? (
        <Stack gap="xs">
          <Text variant="title-3">{ONBOARDING.termsTitle(terms.version)}</Text>
          <Text variant="callout" tone="muted">
            {ONBOARDING.termsIntro}
          </Text>
        </Stack>
      ) : null}
      <Prose blocks={excerpt} frame="framed" testID="terms-excerpt" />
      <Button variant="link" label={ONBOARDING.openLarger} onPress={open} testID="open-terms-text" />
      <Checkbox checked={accepted} onCheckedChange={onAcceptedChange} emphasis="strong" label={terms.accept_label} testID="accept-terms" />
    </Stack>
  );
}
