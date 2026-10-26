// Seeded from react-native-reusables (alert-dialog, on @rn-primitives/alert-dialog), restyled: a panel on
// the elevated surface over an ink scrim, a bold title, actions stacked full width (the primary action
// first). Replaces Alert.alert, which AGENTS.md bans: the system alert can't carry our type or tone.
// Variants: `tone="destructive"` (confirm a destructive action: the action is the danger button), `"default"`
// (a decision), and an info dialog is simply one action and no cancel.
// The portal renders into <PortalHost /> (AppRoot); on iOS it is wrapped in FullWindowOverlay so it also sits
// over native modals and sheets.
import * as AlertDialogPrimitive from '@rn-primitives/alert-dialog';
import * as React from 'react';
import { View } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';
import { haptics } from '../../lib/haptics';
import { duration } from '../../lib/motion';
import { cn, tv } from '../../lib/utils';
import { AnimatedView } from '../../motion/animated';
import { buttonTextVariants, buttonVariants } from './button';
import { Text, TextClassContext } from './text';

const FullWindowOverlay = process.env.EXPO_OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

const alertDialogVariants = tv({
  slots: {
    overlay: 'absolute inset-0 items-center justify-center bg-ink/60 px-6',
    content: 'bg-surface-elevated border-hairline w-full max-w-[400px] gap-6 rounded-xl border px-6 pt-7 pb-6',
    header: 'gap-2',
    title: 'font-bold text-foreground text-[22px] leading-[26px] tracking-[-0.2px]',
    description: 'text-muted-foreground font-normal text-[15px] leading-[22px]',
    footer: 'gap-2',
  },
});

const AlertDialogToneContext = React.createContext<'default' | 'destructive'>('default');

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

function AlertDialogOverlay({ children }: { children?: React.ReactNode }) {
  return (
    <FullWindowOverlay>
      <AlertDialogPrimitive.Overlay asChild>
        <AnimatedView
          entering={FadeIn.duration(duration.quick)}
          exiting={FadeOut.duration(duration.quick)}
          className={alertDialogVariants().overlay()}
        >
          {children}
        </AnimatedView>
      </AlertDialogPrimitive.Overlay>
    </FullWindowOverlay>
  );
}

type AlertDialogContentProps = React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  /** `destructive`: the action is the danger button and confirms with a heavier haptic. */
  tone?: 'default' | 'destructive';
  portalHost?: string;
};

function AlertDialogContent({ className, portalHost, tone = 'default', children, ...props }: AlertDialogContentProps) {
  return (
    <AlertDialogPortal hostName={portalHost}>
      <AlertDialogOverlay>
        <AlertDialogToneContext.Provider value={tone}>
          <AlertDialogPrimitive.Content className={cn(alertDialogVariants().content(), className)} {...props}>
            {children}
          </AlertDialogPrimitive.Content>
        </AlertDialogToneContext.Provider>
      </AlertDialogOverlay>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn(alertDialogVariants().header(), className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn(alertDialogVariants().footer(), className)} {...props} />;
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title className={cn(alertDialogVariants().title(), className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description className={cn(alertDialogVariants().description(), className)} {...props} />;
}

type ActionProps = React.ComponentProps<typeof AlertDialogPrimitive.Action> & { label?: string };

/** The dialog's action: the primary button, or the danger button when the dialog is `tone="destructive"`. */
function AlertDialogAction({ className, label, children, onPress, ...props }: ActionProps) {
  const tone = React.useContext(AlertDialogToneContext);
  const variant = tone === 'destructive' ? 'destructive' : 'primary';
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant })}>
      <AlertDialogPrimitive.Action
        className={cn(buttonVariants({ variant, block: true }), className)}
        onPress={(e) => {
          if (tone === 'destructive') haptics.heavy();
          onPress?.(e);
        }}
        {...props}
      >
        {label !== undefined ? <Text>{label}</Text> : (children as React.ReactNode)}
      </AlertDialogPrimitive.Action>
    </TextClassContext.Provider>
  );
}

/** Backs out without doing anything. Outline, under the action. */
function AlertDialogCancel({ className, label, children, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Cancel> & { label?: string }) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant: 'secondary' })}>
      <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: 'secondary', block: true }), className)} {...props}>
        {label !== undefined ? <Text>{label}</Text> : (children as React.ReactNode)}
      </AlertDialogPrimitive.Cancel>
    </TextClassContext.Provider>
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
export type { AlertDialogContentProps };
