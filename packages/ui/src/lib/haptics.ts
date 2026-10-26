// The haptic vocabulary. Every haptic in the app goes through these names so meaning stays consistent.
// Rules (design-system skill): one success per flow, never on scroll/navigation/passive events,
// always paired with something on screen. The OS mutes these when the user turns haptics off.
import * as Haptics from 'expo-haptics';

export const haptics = {
  /** Picking a segment, a filter, a tab. */
  select: () => void Haptics.selectionAsync().catch(() => {}),
  /** One tap that commits something small: save, add, follow. */
  tap: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  /** The one success moment of a flow. Once per flow. */
  success: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  /** Always alongside on-screen error text. */
  error: () => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
  /** Confirming a destructive action. */
  heavy: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
} as const;

export type HapticName = keyof typeof haptics;
