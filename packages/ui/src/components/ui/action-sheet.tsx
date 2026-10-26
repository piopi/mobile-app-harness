// ActionSheet: a short list of choices anchored to the bottom edge, replacing ActionSheetIOS (banned in
// AGENTS.md). Built on @rn-primitives/dialog (react-native-reusables' dialog primitive) for focus, dismissal
// and accessibility. It is a sheet: rounded top corners (rounded-sheet), a grabber, plain rows inside. The bottom inset comes from react-native-safe-area-context.
// For anything longer than a handful of choices, or with inputs, use a formSheet route and <Sheet> instead.
import * as DialogPrimitive from '@rn-primitives/dialog';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { haptics } from '../../lib/haptics';
import { duration, easing } from '../../lib/motion';
import { tv } from '../../lib/utils';
import { AnimatedView } from '../../motion/animated';
import { Icon } from './icon';
import { Text } from './text';

const FullWindowOverlay = process.env.EXPO_OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

const actionSheetVariants = tv({
  slots: {
    overlay: 'absolute inset-0 justify-end bg-ink/55',
    panel: 'bg-surface-elevated rounded-t-sheet gap-1 px-4 pt-3',
    grabber: 'bg-foreground/20 mb-3 h-[4px] w-9 self-center rounded-full',
    header: 'gap-1 pb-3',
    title: 'font-bold text-foreground text-[20px] leading-[24px] tracking-[-0.2px]',
    message: 'text-muted-foreground font-normal text-[15px] leading-[22px]',
    row: 'border-hairline min-h-[52px] flex-row items-center justify-between gap-3 border-t',
    rowLabel: 'font-medium text-foreground text-[17px] leading-[22px]',
    cancel: 'border-control mt-3 h-[52px] items-center justify-center rounded-md border',
  },
  variants: {
    destructive: { true: { rowLabel: 'text-danger' } },
  },
});

type ActionSheetOption<T extends string> = {
  value: T;
  label: string;
  /** Shows the check mark: the current choice in a single-choice list. */
  selected?: boolean;
  /** Danger-coloured label (delete, leave). Still confirm with an AlertDialog when it can't be undone. */
  destructive?: boolean;
};

type ActionSheetProps<T extends string> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
  options: ActionSheetOption<T>[];
  onSelect: (value: T) => void;
  cancelLabel?: string;
  testID?: string;
};

function ActionSheet<T extends string>({ open, onOpenChange, title, message, options, onSelect, cancelLabel = 'Cancel', testID }: ActionSheetProps<T>) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const s = actionSheetVariants();
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <FullWindowOverlay>
          <AnimatedView entering={FadeIn.duration(duration.quick)} exiting={FadeOut.duration(duration.quick)} className="absolute inset-0">
            {/* The overlay is a Pressable: a tap on the scrim dismisses. */}
            <DialogPrimitive.Overlay className={s.overlay()}>
              <DialogPrimitive.Content asChild>
                <AnimatedView
                  entering={reduced ? FadeIn.duration(duration.quick) : SlideInDown.duration(duration.standard).easing(easing.settle)}
                  exiting={reduced ? FadeOut.duration(duration.quick) : SlideOutDown.duration(duration.quick)}
                  className={s.panel()}
                  style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
                  testID={testID}
                >
                  <View className={s.grabber()} />
                  {title || message ? (
                    <View className={s.header()}>
                      {title ? <DialogPrimitive.Title className={s.title()}>{title}</DialogPrimitive.Title> : null}
                      {message ? <DialogPrimitive.Description className={s.message()}>{message}</DialogPrimitive.Description> : null}
                    </View>
                  ) : null}
                  {options.map((o) => (
                    <Pressable
                      key={o.value}
                      className={s.row()}
                      role="menuitem"
                      accessibilityState={{ selected: !!o.selected }}
                      accessibilityLabel={o.label}
                      testID={testID ? `${testID}-${o.value}` : undefined}
                      onPress={() => {
                        haptics.select();
                        onSelect(o.value);
                        onOpenChange(false);
                      }}
                    >
                      <Text className={actionSheetVariants({ destructive: !!o.destructive }).rowLabel()}>{o.label}</Text>
                      {o.selected ? <Icon name="check" size={16} /> : null}
                    </Pressable>
                  ))}
                  <DialogPrimitive.Close className={s.cancel()} accessibilityLabel={cancelLabel}>
                    <Text variant="label">{cancelLabel}</Text>
                  </DialogPrimitive.Close>
                </AnimatedView>
              </DialogPrimitive.Content>
            </DialogPrimitive.Overlay>
          </AnimatedView>
        </FullWindowOverlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { ActionSheet };
export type { ActionSheetOption, ActionSheetProps };
