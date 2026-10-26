import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button, buttonVariants } from './button';

describe('Button', () => {
  it('renders its label and handles a press', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button disabled label="Continue" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('pads a header item on both sides, unlike an inline link', () => {
    const header = buttonVariants({ variant: 'link', size: 'header' });
    expect(header).toContain('px-3');
    expect(header).not.toContain('px-0');
    expect(buttonVariants({ variant: 'link' })).toContain('px-0');
  });
});
