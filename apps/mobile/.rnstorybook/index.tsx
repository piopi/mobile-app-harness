import { LiteUI } from '@storybook/react-native-ui-lite';
import { view } from './storybook.requires';

// In-memory selection storage: no AsyncStorage native module needed.
const memory = new Map<string, string>();
const storage = {
  getItem: async (key: string) => memory.get(key) ?? null,
  setItem: async (key: string, value: string) => void memory.set(key, value),
};

/** The full catalog, or a single story with no chrome when `storyId` is given (for screenshots). */
export function getStorybookUI(storyId?: string) {
  return view.getStorybookUI({
    storage,
    CustomUIComponent: LiteUI,
    shouldPersistSelection: false,
    ...(storyId ? { initialSelection: storyId as `${string}--${string}`, onDeviceUI: false } : {}),
  });
}
