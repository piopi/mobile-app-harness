import { fireEvent, render, screen } from '@testing-library/react-native';
import { FilterChips } from './filter-chips';

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'drafts', label: 'Drafts' },
] as const;

describe('FilterChips', () => {
  it('announces a radio group and reports a new choice', async () => {
    const onChange = jest.fn();
    await render(<FilterChips label="Filter items" options={OPTIONS} value="all" onChange={onChange} />);
    expect(screen.getByLabelText('Filter items')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Drafts' }));
    expect(onChange).toHaveBeenCalledWith('drafts');
  });

  it('ignores a press on the current choice', async () => {
    const onChange = jest.fn();
    await render(<FilterChips label="Filter items" options={OPTIONS} value="all" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'All' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
