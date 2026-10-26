import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

function Confirm({ tone, onAction, onOpenChange }: { tone?: 'default' | 'destructive'; onAction: () => void; onOpenChange: (o: boolean) => void }) {
  return (
    <>
      <AlertDialog open onOpenChange={onOpenChange}>
        <AlertDialogContent tone={tone}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction label="Delete" onPress={onAction} />
          <AlertDialogCancel label="Keep it" />
        </AlertDialogContent>
      </AlertDialog>
      <PortalHost />
    </>
  );
}

describe('AlertDialog', () => {
  it('shows the title, copy and both actions', async () => {
    await render(<Confirm onAction={jest.fn()} onOpenChange={jest.fn()} />);
    expect(screen.getByText('Delete this item?')).toBeTruthy();
    expect(screen.getByText("This can't be undone.")).toBeTruthy();
    expect(screen.getByText('Keep it')).toBeTruthy();
  });

  it('runs the action, closes, and taps a heavy haptic when destructive', async () => {
    const onAction = jest.fn();
    const onOpenChange = jest.fn();
    await render(<Confirm tone="destructive" onAction={onAction} onOpenChange={onOpenChange} />);
    fireEvent.press(screen.getByText('Delete'));
    expect(onAction).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
  });

  it('cancel closes without the action', async () => {
    const onAction = jest.fn();
    const onOpenChange = jest.fn();
    await render(<Confirm onAction={onAction} onOpenChange={onOpenChange} />);
    fireEvent.press(screen.getByText('Keep it'));
    expect(onAction).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
