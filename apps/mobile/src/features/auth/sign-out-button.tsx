import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, ListRow } from '@app/ui';
import { useState } from 'react';
import { signOut } from '../../lib/session';
import { HOLD } from './copy';

type SignOutButtonProps = {
  /** `row` for a settings list (Me), `link` for a header, `secondary` for a hold screen's one action. */
  as?: 'row' | 'link' | 'secondary';
  testID?: string;
};

/** Sign out, confirmed with the branded dialog. The root gate then shows sign-in. */
export function SignOutButton({ as = 'secondary', testID = 'sign-out' }: SignOutButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {as === 'row' ? (
        <ListRow title={HOLD.signOut} onPress={() => setOpen(true)} testID={testID} divider={false} />
      ) : (
        <Button variant={as === 'link' ? 'link' : 'secondary'} size={as === 'link' ? 'header' : 'default'} block={as === 'secondary'} icon="sign-out" label={HOLD.signOut} onPress={() => setOpen(true)} testID={testID} />
      )}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent tone="destructive">
          <AlertDialogHeader>
            <AlertDialogTitle>{HOLD.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{HOLD.confirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction label={HOLD.signOut} testID="confirm-sign-out" onPress={() => void signOut()} />
            <AlertDialogCancel label={HOLD.stay} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
