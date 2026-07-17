ALTER TABLE public.pgr_documents
  ADD COLUMN IF NOT EXISTS conclusion_intro text,
  ADD COLUMN IF NOT EXISTS engineering_measures text,
  ADD COLUMN IF NOT EXISTS administrative_controls text,
  ADD COLUMN IF NOT EXISTS trainings text,
  ADD COLUMN IF NOT EXISTS monitoring_text text,
  ADD COLUMN IF NOT EXISTS epi_text text;