import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const PCMSO_BETA = 'PCMSO_BETA';

export interface PcmsoCompany {
  company_id: string;
  company_name: string;
  can_prepare: boolean;
  clinical_role: string | null;
}

/** Empresas liberadas no PCMSO — decisão 100% no backend (pcmso_accessible_companies). */
export function usePcmsoCompanies() {
  const [companies, setCompanies] = useState<PcmsoCompany[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc('pcmso_accessible_companies');
      if (cancelled) return;
      setCompanies(error ? [] : (data as PcmsoCompany[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);
  return { companies, loading };
}

/** Verifica uma ação específica do PCMSO em uma empresa (pcmso_can). */
export function usePcmsoCan(companyId: string | undefined, permission: string) {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (!companyId) { setAllowed(false); setLoading(false); return; }
    (async () => {
      const { data, error } = await (supabase as any).rpc('pcmso_can', {
        _company_id: companyId,
        _permission: permission,
      });
      if (cancelled) return;
      setAllowed(!error && data === true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [companyId, permission]);
  return { allowed, loading };
}
