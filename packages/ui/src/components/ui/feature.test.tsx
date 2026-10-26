import { render, screen } from '@testing-library/react-native';
import { Feature, IconTile } from './feature';

describe('Feature', () => {
  it('pairs an icon tile with a title and body', async () => {
    await render(<Feature icon="shield" title="Private by default." body="Only you see your account." />);
    expect(screen.getByTestId('icon-shield', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Private by default.')).toBeTruthy();
    expect(screen.getByText('Only you see your account.')).toBeTruthy();
  });

  it('renders a tile on its own', async () => {
    await render(<IconTile icon="lock" size="lg" testID="tile" />);
    expect(screen.getByTestId('icon-lock', { includeHiddenElements: true })).toBeTruthy();
  });
});
