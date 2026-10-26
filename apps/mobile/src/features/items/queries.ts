import { item, ITEM_COLUMNS, type Item } from '@app/shared';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

/** Reads go direct to Supabase under RLS: members get published items, staff every status. */
export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase.from('items').select(ITEM_COLUMNS).neq('status', 'archived').order('sort').order('published_at', { ascending: false });
      if (error) throw error;
      return item.array().parse(data);
    },
  });
}

export function useItem(id: string | undefined) {
  return useQuery({
    queryKey: ['items', id],
    enabled: !!id,
    queryFn: async (): Promise<Item | null> => {
      const { data, error } = await supabase.from('items').select(ITEM_COLUMNS).eq('id', id!).maybeSingle();
      if (error) throw error;
      return data ? item.parse(data) : null;
    },
  });
}
