import type { Preview } from '@storybook/react-native';
import { Screen } from '@app/ui';

const preview: Preview = {
  // Screen (or the fullscreen story itself) owns the safe areas; Storybook's own padding would show the
  // navigator's ground as bars above and below the story.
  parameters: { noSafeArea: true },
  decorators: [
    // `parameters.layout: 'fullscreen'` renders the story edge to edge (reference screens, heroes);
    // everything else sits on a padded, scrollable Screen.
    (Story, { parameters }) =>
      parameters.layout === 'fullscreen' ? (
        <Story />
      ) : (
        <Screen scroll>
          <Story />
        </Screen>
      ),
  ],
};

export default preview;
