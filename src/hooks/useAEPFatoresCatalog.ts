import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AEPFatorCatalogo {
  id: string;
  codigo: string;
  categoria: 'ergonomico_fisico' | 'ergonomico_organizacional' | 'ergonomico_cognitivo' | 'psicossocial';
  nome: string;
  descricao: string | null;
  severidade_tipica: number | null;
  probabilidade_tipica: number | null;
  ativo: boolean;
}

export const AEP_CATEGORIAS: Record<AEPFatorCatalogo['categoria'], string> = {
  ergonomico_fisico: 'Ergonômico físico/biomecânico',
  ergonomico_organizacional: 'Ergonômico organizacional',
  ergonomico_cognitivo: 'Ergonômico cognitivo',
  psicossocial: 'Psicossocial',
};

export const AEP_CATEGORIA_COLORS: Record<AEPFatorCatalogo['categoria'], string> = {
  ergonomico_fisico: 'bg-blue-100 text-blue-700 border-blue-300',
  ergonomico_organizacional: 'bg-amber-100 text-amber-700 border-amber-300',
  ergonomico_cognitivo: 'bg-purple-100 text-purple-700 border-purple-300',
  psicossocial: 'bg-rose-100 text-rose-700 border-rose-300',
};

let cache: AEPFatorCatalogo[] | null = null;

export function useAEPFatoresCatalog() {
  const [data, setData] = useState<AEPFatorCatalogo[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    (async () => {
      const { data, error } = await supabase
        .from('aep_fatores_catalogo' as any)
        .select('*')
        .eq('ativo', true)
        .order('categoria')
        .order('nome');
      if (!error && data) {
        cache = data as any;
        setData(data as any);
      }
      setLoading(false);
    })();
  }, []);

  return { data, loading };
}
