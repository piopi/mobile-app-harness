import { fireEvent, render, screen } from '@testing-library/react-native';
import { ListRow, ListRowThumb } from './list-row';

describe('ListRow', () => {
  it('renders title, subtitle and a trailing value', async () => {
    await render(<ListRow title="Ada L." subtitle="Member" trailing="6" />);
    expect(screen.getByText('Ada L.')).toBeTruthy();
    expect(screen.getByText('Member')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
  });

  it('becomes a button when pressable, with an arrow', async () => {
    const onPress = jest.fn();
    await render(<ListRow title="Settings" arrow onPress={onPress} />);
    expect(screen.getByTestId('icon-caret-right', { includeHiddenElements: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('draws an empty tile when a thumbnail has no photo', async () => {
    const { toJSON } = await render(<ListRowThumb source={null} />);
    expect(toJSON()).toBeTruthy();
  });
});
