import { useNavigation } from 'expo-router';
import { useEffect, type RefObject } from 'react';

/**
 * Focus a field once the push animation ends. `autoFocus` raises the keyboard mid-transition, and iOS then
 * scrolls the native-header screen's content up under the header; waiting for `transitionEnd` avoids it.
 */
export function useFocusAfterTransition(ref: RefObject<{ focus: () => void } | null>) {
  const navigation = useNavigation();
  useEffect(() => navigation.addListener('transitionEnd' as never, () => ref.current?.focus()), [navigation, ref]);
}
