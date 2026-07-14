
ALTER TABLE public.aep_fatores_avaliados ADD COLUMN IF NOT EXISTS escopo_ref text;
ALTER TABLE public.aep_participantes ADD COLUMN IF NOT EXISTS escopo_ref text;
CREATE INDEX IF NOT EXISTS idx_aep_fatores_escopo_ref ON public.aep_fatores_avaliados(aep_id, escopo_ref);
CREATE INDEX IF NOT EXISTS idx_aep_participantes_escopo_ref ON public.aep_participantes(aep_id, escopo_ref);
