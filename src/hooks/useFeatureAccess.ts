import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Verificação centralizada de feature flags.
 *
 * A decisão vem SEMPRE do backend (RPC `has_feature_access`), que resolve o
 * usuário internamente via auth.uid(). O frontend não envia user_id, não lê a
 * tabela `feature_access` e não pode alterá-la.
 */
export function useFeatureAccess(featureKey: string, companyId?: string | null) {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) { setAllowed(false); setLoading(false); }
          return;
        }
        const { data, error } = await supabase.rpc('has_feature_access', {
          _feature_key: featureKey,
          _company_id: companyId ?? null,
        });
        if (cancelled) return;
        setAllowed(!error && data === true);
      } catch {
        if (!cancelled) setAllowed(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [featureKey, companyId]);

  return { allowed, loading };
}

export const LTCAT_BETA = 'LTCAT_BETA';
