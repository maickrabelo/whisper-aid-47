import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyFeatures {
  ouvidoria: boolean;
  psicossocial: boolean;
  burnout: boolean;
  clima: boolean;
  treinamentos: boolean;
  ouvidoria_smart: boolean;
}

const DEFAULTS: CompanyFeatures = {
  ouvidoria: true,
  psicossocial: true,
  burnout: true,
  clima: true,
  treinamentos: true,
  ouvidoria_smart: false,
};

export function useCompanyFeatures(companyId: string | null | undefined) {
  const [features, setFeatures] = useState<CompanyFeatures>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!companyId) {
      setFeatures(DEFAULTS);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    (async () => {
      const [{ data, error }, { data: smartData }] = await Promise.all([
        supabase.rpc('get_company_features', { _company_id: companyId }),
        (supabase as any).rpc('company_has_smart_ouvidoria', { _company_id: companyId }),
      ]);
      if (!active) return;
      if (error || !data || data.length === 0) {
        setFeatures({ ...DEFAULTS, ouvidoria_smart: !!smartData });
      } else {
        const row = data[0] as any;
        setFeatures({
          ouvidoria: row.ouvidoria_enabled ?? true,
          psicossocial: row.psicossocial_enabled ?? true,
          burnout: row.burnout_enabled ?? true,
          clima: row.clima_enabled ?? true,
          treinamentos: row.treinamentos_enabled ?? true,
          ouvidoria_smart: !!smartData,
        });
      }
      setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  return { features, isLoading };
}

