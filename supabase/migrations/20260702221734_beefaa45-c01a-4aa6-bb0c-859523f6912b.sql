ALTER TABLE public.aep_fatores_avaliados
  ADD COLUMN IF NOT EXISTS source_assessment_type text
    CHECK (source_assessment_type IN ('hseit','copsoq') OR source_assessment_type IS NULL),
  ADD COLUMN IF NOT EXISTS source_assessment_id uuid;

CREATE INDEX IF NOT EXISTS idx_aep_fatores_source
  ON public.aep_fatores_avaliados (source_assessment_type, source_assessment_id)
  WHERE source_assessment_type IS NOT NULL;