ALTER TABLE public.copsoq_assessments
  ADD COLUMN IF NOT EXISTS questionnaire_version TEXT NOT NULL DEFAULT 'short';

ALTER TABLE public.copsoq_assessments
  DROP CONSTRAINT IF EXISTS copsoq_assessments_questionnaire_version_check;

ALTER TABLE public.copsoq_assessments
  ADD CONSTRAINT copsoq_assessments_questionnaire_version_check
  CHECK (questionnaire_version IN ('short', 'medium'));

COMMENT ON COLUMN public.copsoq_assessments.questionnaire_version IS 'Versão do questionário COPSOQ II: short (41 itens, 23 dimensões) ou medium (76 itens, 29 dimensões - Silva et al. 2011). Definida na criação e imutável depois.';