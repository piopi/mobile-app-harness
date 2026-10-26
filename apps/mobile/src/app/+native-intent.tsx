import { handleAgentLink } from '../dev/agent-events';
import { getLastPathname } from '../dev/last-pathname';

/**
 * Rewrites incoming deep links before Expo Router sees them.
 * - `<scheme>://__agent/<event>`: dev-only agent events. Handled here, the app stays on its current screen.
 * - `<scheme>://__storybook/<story-id>`: opens one story full screen (needs EXPO_PUBLIC_STORYBOOK=true).
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  if (handleAgentLink(path, __DEV__)) return initial ? '/' : getLastPathname();
  const story = path.match(/(?:^|\/)__storybook\/([^/?#]+)/);
  if (story) return `/storybook?story=${encodeURIComponent(story[1]!)}`;
  return path;
}
