import { Button, Card, CardContent, Screen, Stack, Text } from '@app/ui';
import { useState } from 'react';
import { rpcSaveError, TERMS } from '../../features/auth/copy';
import { useCurrentTerms } from '../../features/onboarding/queries';
import { TermsAcceptance } from '../../features/onboarding/terms-acceptance';
import { refreshLaunchStatus } from '../../lib/session';
import { supabase } from '../../lib/supabase';

/**
 * Terms re-accept: an admin published a new version. Until the member accepts it, the database refuses every
 * member RPC (`terms_required`). "What changed" shows when the admin wrote it.
 */
export default function TermsReaccept() {
  const terms = useCurrentTerms();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const doc = terms.data;

  const accept = async () => {
    if (!doc || !accepted) return;
    setBusy(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('accept_terms', { version: doc.version });
      if (rpcError) throw rpcError;
      await refreshLaunchStatus();
    } catch (e) {
      setError(rpcSaveError(e, TERMS.saveFailed, TERMS.saveOffline));
      setBusy(false);
      void terms.refetch();
    }
  };

  return (
    <Screen native testID="terms-screen">
      {doc ? (
        <>
          <Stack gap="sm">
            <Text variant="title-2">{TERMS.reacceptTitle}</Text>
            <Text variant="body" tone="muted">
              {TERMS.reacceptLede(doc.version)}
            </Text>
          </Stack>
          {doc.changes.length ? (
            <Card testID="terms-changes">
              <CardContent>
                <Text variant="title-3">{TERMS.whatChanged}</Text>
                {doc.changes.map((c) => (
                  <Text key={c} variant="callout">
                    {`· ${c}`}
                  </Text>
                ))}
              </CardContent>
            </Card>
          ) : null}
          <TermsAcceptance terms={doc} accepted={accepted} onAcceptedChange={setAccepted} />
          {error ? (
            <Text variant="callout" tone="danger" testID="terms-error">
              {error}
            </Text>
          ) : null}
          <Button block label={busy ? TERMS.saving : TERMS.acceptButton} trailing={busy ? undefined : '→'} disabled={!accepted || busy} onPress={() => void accept()} testID="terms-accept" />
        </>
      ) : null}
    </Screen>
  );
}
