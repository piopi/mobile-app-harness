import { termsDocument, type TermsDocument } from '@app/shared';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

/** The current terms (terms_versions, readable by anyone): text, acceptance line, what changed. */
export function useCurrentTerms() {
  return useQuery({
    queryKey: ['terms', 'current'],
    // Always fresh: an admin can publish a new version at any time, and the member must accept the current one.
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async (): Promise<TermsDocument> => {
      const { data, error } = await supabase
        .from('terms_versions')
        .select('version, title, body, accept_label, changes, published_at')
        .eq('is_current', true)
        .single();
      if (error) throw error;
      return termsDocument.parse(data);
    },
  });
}
