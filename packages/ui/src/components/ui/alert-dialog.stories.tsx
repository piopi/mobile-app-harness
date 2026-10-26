import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';

const meta = { title: 'UI/AlertDialog', component: View, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof View>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Destructive: Story = {
  render: () => (
    <AlertDialog open onOpenChange={() => {}}>
      <AlertDialogContent tone="destructive">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>It disappears for everyone. This can't be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction label="Delete" />
          <AlertDialogCancel label="Keep it" />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

export const Info: Story = {
  render: () => (
    <AlertDialog open onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Saved.</AlertDialogTitle>
          <AlertDialogDescription>An info dialog has one action and no cancel.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction label="OK" />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
