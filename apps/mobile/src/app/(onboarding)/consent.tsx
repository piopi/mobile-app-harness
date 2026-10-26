import { parseRpcInput } from '@app/shared';
import { Button, Checkbox, Progress, Screen, Text } from '@app/ui';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ONBOARDING } from '../../features/auth/copy';
import { resetDraft, useDraft } from '../../features/onboarding/draft';
import { useCurrentTerms } from '../../features/onboarding/queries';
import { TermsAcceptance } from '../../features/onboarding/terms-acceptance';
import { refreshLaunchStatus } from '../../lib/session';
import { supabase } from '../../lib/supabase';

/**
 * Onboarding 2 / 2: 18+, the current terms (data, terms_versions) and the optional marketing consent. "Finish
 * setup" saves everything in one complete_onboarding call and the gate opens the app.
 */
export default function Consent() {
  const draft = useDraft();
  const terms = useCurrentTerms();
  const [adult, setAdult] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A relaunch mid-onboarding loses the draft: start again from the details.
  if (!draft.details && !busy) return <Redirect href="/details" />;

  const ready = adult && accepted && !!terms.data && !busy;
  const finish = async () => {
    if (!ready || !terms.data) return;
    setBusy(true);
    setError(null);
    try {
      const args = parseRpcInput('complete_onboarding', { ...draft.details, terms_version: terms.data.version, adult: true, marketing });
      const { error: rpcError } = await supabase.rpc('complete_onboarding', args);
      if (rpcError) throw rpcError;
      await refreshLaunchStatus();
      resetDraft();
    } catch {
      setError(ONBOARDING.saveFailed);
      setBusy(false);
      void terms.refetch();
    }
  };

  return (
    <Screen native testID="onboarding-consent">
      <Text variant="title-1">{ONBOARDING.consentTitle}</Text>
      <Progress step={2} of={2} label={ONBOARDING.consentStep} testID="onboarding-progress" />
      <Checkbox checked={adult} onCheckedChange={setAdult} emphasis="strong" label={ONBOARDING.adult} description={ONBOARDING.adultDetail} testID="adult" />
      {terms.data ? <TermsAcceptance intro terms={terms.data} accepted={accepted} onAcceptedChange={setAccepted} /> : null}
      <Checkbox checked={marketing} onCheckedChange={setMarketing} label={ONBOARDING.marketing} description={ONBOARDING.marketingDetail} testID="marketing" />
      {error ? (
        <Text variant="callout" tone="danger" testID="finish-error">
          {error}
        </Text>
      ) : null}
      <Button block label={ONBOARDING.finish} trailing="→" disabled={!ready} onPress={() => void finish()} testID="finish-setup" />
    </Screen>
  );
}
