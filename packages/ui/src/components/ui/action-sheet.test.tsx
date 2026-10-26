import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ActionSheet } from './action-sheet';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {},
  NotificationFeedbackType: {},
}));

const options = [
  { value: 'system' as const, label: 'System', selected: true },
  { value: 'dark' as const, label: 'Dark' },
];

describe('ActionSheet', () => {
  it('lists the choices and marks the current one', async () => {
    await render(
      <>
        <ActionSheet open onOpenChange={jest.fn()} title="Appearance" options={options} onSelect={jest.fn()} testID="sheet" />
        <PortalHost />
      </>,
    );
    expect(screen.getByText('Appearance')).toBeTruthy();
    expect(screen.getByLabelText('System').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('icon-check', { includeHiddenElements: true })).toBeTruthy();
  });

  it('picks a choice and closes', async () => {
    const onSelect = jest.fn();
    const onOpenChange = jest.fn();
    await render(
      <>
        <ActionSheet open onOpenChange={onOpenChange} options={options} onSelect={onSelect} />
        <PortalHost />
      </>,
    );
    fireEvent.press(screen.getByLabelText('Dark'));
    expect(onSelect).toHaveBeenCalledWith('dark');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
