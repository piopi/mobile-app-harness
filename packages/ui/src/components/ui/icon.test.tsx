import { render, screen } from '@testing-library/react-native';
import { Icon, iconNames } from './icon';

describe('Icon', () => {
  it('is decorative and sized', async () => {
    await render(<Icon name="check" size={20} />);
    const icon = screen.getByTestId('icon-check', { includeHiddenElements: true });
    expect(icon).toHaveStyle({ width: 20, height: 20 });
    expect(screen.queryByTestId('icon-check')).toBeNull();
  });

  it('maps every name to a Phosphor glyph', async () => {
    for (const name of iconNames) {
      await render(<Icon name={name} />);
      expect(screen.getByTestId(`icon-${name}`, { includeHiddenElements: true })).toBeTruthy();
    }
  });
});
