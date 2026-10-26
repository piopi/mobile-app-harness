import { Button, Card, CardContent, CardHeader, CardTitle, ListRow, Screen, SectionHeader, Stack, Text } from '@app/ui';
import { Redirect, router } from 'expo-router';
import { dispatchAgentEvent, useAgentState } from '../../../dev/agent-events';
import { DEV_ACCOUNTS } from '../../../lib/auth/dev-accounts';
import { useNow } from '../../../lib/clock';
import { env } from '../../../lib/env';

/**
 * The dev panel (dev builds only): the agent state, one-tap agent events, the seeded accounts and the Storybook
 * route. Agents drive the same events with `pnpm agent <event>`; this is the human's way in.
 */
export default function DevPanel() {
  const agent = useAgentState();
  const now = useNow();
  if (!__DEV__) return <Redirect href="/me" />;
  const send = (event: string, payload?: unknown) => dispatchAgentEvent(event, payload);

  return (
    <Screen native testID="dev-panel">
      <Card testID="agent-state">
        <CardHeader>
          <CardTitle>Agent state</CardTitle>
        </CardHeader>
        <CardContent>
          <Text variant="data">SLOT {env.slot} · METRO {env.metroPort}</Text>
          <Text variant="data">THEME {agent.theme.toUpperCase()}</Text>
          <Text variant="data">NETWORK {agent.offline ? 'OFFLINE' : 'ONLINE'}</Text>
          <Text variant="data">CLOCK {now.toISOString().slice(0, 16).replace('T', ' ')}Z</Text>
          <Text variant="data" testID="last-event">
            LAST EVENT {agent.lastEvent ?? '-'}
          </Text>
        </CardContent>
      </Card>

      <Stack gap="sm">
        <SectionHeader title="Agent events" size="sm" />
        <Stack direction="row" gap="sm" wrap>
          <Button size="sm" variant="secondary" label={agent.offline ? 'Online' : 'Offline'} onPress={() => send(agent.offline ? 'online' : 'offline')} testID="dev-offline" />
          <Button size="sm" variant="secondary" label="Light" onPress={() => send('theme', { theme: 'light' })} />
          <Button size="sm" variant="secondary" label="Dark" onPress={() => send('theme', { theme: 'dark' })} />
          <Button size="sm" variant="secondary" label="+1 day" onPress={() => send('time-travel', { offsetMinutes: 24 * 60 })} />
          <Button size="sm" variant="secondary" label="Refetch" onPress={() => send('refetch')} />
          <Button size="sm" variant="secondary" label={agent.plainChrome ? 'Branded chrome' : 'Plain chrome'} onPress={() => send('chrome', { plain: !agent.plainChrome })} />
          <Button size="sm" variant="ghost" label="Reset" onPress={() => send('reset')} />
        </Stack>
        <Text variant="callout" tone="muted">
          Agents send these with `pnpm agent &lt;event&gt; [json]`. The table is in apps/mobile/src/dev/agent-events.ts.
        </Text>
      </Stack>

      <Stack gap="none">
        <SectionHeader title="Sign in as" size="sm" />
        {DEV_ACCOUNTS.map((a) => (
          <ListRow key={a.email} title={a.email} subtitle={a.who} density="compact" arrow onPress={() => send('sign-in', { email: a.email })} />
        ))}
      </Stack>

      {env.storybook ? <Button variant="secondary" label="Component catalog (Storybook)" onPress={() => router.push('/storybook')} testID="open-storybook" /> : null}
    </Screen>
  );
}
