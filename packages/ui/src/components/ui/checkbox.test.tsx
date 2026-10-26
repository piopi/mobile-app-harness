import { fireEvent, render, screen } from '@testing-library/react-native';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('is a checkbox whose whole row toggles it', async () => {
    const onCheckedChange = jest.fn();
    await render(<Checkbox checked={false} onCheckedChange={onCheckedChange} label="I accept the terms." testID="accept" />);
    const box = screen.getByRole('checkbox', { name: 'I accept the terms.' });
    expect(box).not.toBeChecked();
    await fireEvent.press(screen.getByText('I accept the terms.'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('shows the check only when ticked', async () => {
    const { rerender } = await render(<Checkbox checked={false} onCheckedChange={() => {}} label="Updates" />);
    expect(screen.queryByTestId('icon-check', { includeHiddenElements: true })).toBeNull();
    await rerender(<Checkbox checked onCheckedChange={() => {}} label="Updates" />);
    expect(screen.getByTestId('icon-check', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('does nothing when disabled', async () => {
    const onCheckedChange = jest.fn();
    await render(<Checkbox checked={false} disabled onCheckedChange={onCheckedChange} label="Off" />);
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
