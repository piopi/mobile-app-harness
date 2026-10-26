import { render, screen } from '@testing-library/react-native';
import { Prose } from './prose';

describe('Prose', () => {
  it('renders each kind of block', async () => {
    await render(
      <Prose
        blocks={[
          { kind: 'title', text: 'TERMS' },
          { kind: 'heading', text: '1. Who' },
          { kind: 'paragraph', inline: [{ text: 'Plain and ', strong: false }, { text: 'strong', strong: true }] },
          { kind: 'list', items: [[{ text: 'One', strong: false }], [{ text: 'Two', strong: false }]] },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'TERMS' })).toBeTruthy();
    expect(screen.getByText('1. Who')).toBeTruthy();
    expect(screen.getByText('strong')).toBeTruthy();
    expect(screen.getByText('One')).toBeTruthy();
    expect(screen.getByText('Two')).toBeTruthy();
  });
});
