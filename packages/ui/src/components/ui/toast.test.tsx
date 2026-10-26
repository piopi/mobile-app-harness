import { render, screen } from '@testing-library/react-native';
import { Toast } from './toast';

describe('Toast', () => {
  it('announces itself as an alert', async () => {
    await render(<Toast tone="error" message="That code expired." animated={false} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('That code expired.')).toBeTruthy();
  });
});
