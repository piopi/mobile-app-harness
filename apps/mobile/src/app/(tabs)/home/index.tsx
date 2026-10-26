import { Button, Card, CardContent, CardHeader, CardTitle, FadeInBackground, Screen, Stack, Text } from '@app/ui';
import { router } from 'expo-router';
import { useAgentState } from '../../../dev/agent-events';
import { APP_NAME } from '../../../lib/app';
import { useBackendHealth } from '../../../lib/backend';
import { env } from '../../../lib/env';
import { useSession } from '../../../lib/session';

/**
 * Home (placeholder until the first feature): the hero, the greeting, and the harness panel that proves this
 * slot's Metro and Supabase stack are wired. `pnpm wt up` is proven when "Harness ready." and "BACKEND ok" show.
 */
export default function Home() {
  const backend = useBackendHealth();
  const agent = useAgentState();
  const { launch } = useSession();

  const backendLabel = backend.isPending ? 'connecting…' : backend.isError ? `error: ${backend.error.message}` : `ok · terms v${backend.data.termsVersion ?? '-'}`;

  return (
    <Screen native padded={false} edges="none" testID="home-screen">
      <FadeInBackground height="short">
        <Stack flex justify="end" inset="gutter" gap="xs">
          <Text variant="kicker" tone="muted">
            {APP_NAME}
          </Text>
          <Text variant="display">{launch?.display_name ? `Hello, ${launch.display_name}.` : 'Hello.'}</Text>
          <Text variant="body" testID="harness-ready">
            Harness ready.
          </Text>
        </Stack>
      </FadeInBackground>

      <Stack inset="gutter" gap="lg">
        <Button variant="secondary" icon="items" label="Browse items" trailing="→" onPress={() => router.push('/items')} testID="open-items" />

        {/* The harness panel; demo recordings hide it (`__agent/demo`). */}
        {agent.demo ? null : (
          <Card testID="harness-panel">
            <CardHeader>
              <CardTitle>This worktree</CardTitle>
            </CardHeader>
            <CardContent>
              <Text variant="data" testID="slot-line">
                SLOT {env.slot} · METRO {env.metroPort}
              </Text>
              <Text variant="data" testID="backend-line">
                BACKEND {backendLabel}
              </Text>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Screen>
  );
}
