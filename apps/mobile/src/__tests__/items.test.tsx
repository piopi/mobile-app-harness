import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import Items from '../app/(tabs)/items';
import ItemDetail from '../app/(tabs)/items/[id]';
import { renderWithClient } from './support/render';
import { setTable } from './support/mock-supabase';

jest.mock('../lib/supabase', () => require('./support/mock-supabase'));
let mockStaff = false;
jest.mock('../lib/session', () => ({ useSession: () => ({ isStaff: mockStaff }) }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: () => ({ id: '00000000-0000-4000-a000-000000000001' }),
  Stack: { Screen: () => null },
}));

const ITEM = (n: number, status = 'published') => ({
  id: `00000000-0000-4000-a000-00000000000${n}`,
  title: `Item ${n}`,
  summary: n === 1 ? 'The first one.' : null,
  body: n === 1 ? '## Start here\n\nBody text.' : null,
  status,
  sort: n,
  published_at: status === 'published' ? '2026-01-01T00:00:00Z' : null,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockStaff = false;
});

describe('Items list', () => {
  it('lists items and pushes the detail', async () => {
    setTable('items', [ITEM(1), ITEM(2)]);
    await renderWithClient(<Items />);
    expect(await screen.findByText('Item 1')).toBeTruthy();
    expect(screen.queryByTestId('items-filter')).toBeNull();
    await fireEvent.press(screen.getByTestId(`item-${ITEM(1).id}`));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/items/[id]', params: { id: ITEM(1).id } });
  });

  it('shows the empty state', async () => {
    setTable('items', []);
    await renderWithClient(<Items />);
    expect(await screen.findByTestId('items-empty')).toBeTruthy();
  });

  it('shows the error state with a retry', async () => {
    setTable('items', null, { message: 'Network request failed' });
    await renderWithClient(<Items />);
    expect(await screen.findByTestId('items-error')).toBeTruthy();
  });

  it('lets staff filter drafts', async () => {
    mockStaff = true;
    setTable('items', [ITEM(1), ITEM(2, 'draft')]);
    await renderWithClient(<Items />);
    await screen.findByText('Item 2');
    await fireEvent.press(screen.getByRole('radio', { name: 'Drafts' }));
    expect(screen.queryByText('Item 1')).toBeNull();
    expect(screen.getByText('Item 2')).toBeTruthy();
  });
});

describe('Item detail', () => {
  it('renders the title, summary and body', async () => {
    setTable('items', ITEM(1));
    await renderWithClient(<ItemDetail />);
    expect(await screen.findByText('The first one.')).toBeTruthy();
    expect(screen.getByText('Start here')).toBeTruthy();
  });
});
