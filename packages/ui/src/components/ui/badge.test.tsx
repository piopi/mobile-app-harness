import { render, screen } from '@testing-library/react-native';
import { Badge } from './badge';

describe('Badge', () => {
  it('pairs a status icon with its word', async () => {
    await render(<Badge variant="verified" label="Verified" />);
    expect(screen.getByTestId('icon-check', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText('Verified')).toBeTruthy();
  });

  it('drops the icon when asked', async () => {
    await render(<Badge variant="pending" label="3 left" icon={null} />);
    expect(screen.queryByTestId('icon-pending', { includeHiddenElements: true })).toBeNull();
  });
});
