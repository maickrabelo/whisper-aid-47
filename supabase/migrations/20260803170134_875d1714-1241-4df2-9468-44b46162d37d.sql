ALTER TABLE public.pgr_documents
  ADD COLUMN IF NOT EXISTS org_responsibility_text text,
  ADD COLUMN IF NOT EXISTS org_responsible_name text,
  ADD COLUMN IF NOT EXISTS org_responsible_role text,
  ADD COLUMN IF NOT EXISTS org_responsible_cpf text;