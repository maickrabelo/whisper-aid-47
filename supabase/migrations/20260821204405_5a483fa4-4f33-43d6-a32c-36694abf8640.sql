-- =========================================================
-- FASE 1 — Fundação de Acesso (Feature Flags + LTCAT Beta)
-- =========================================================

-- 1) feature_flags
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  beta boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sem GRANT para anon/authenticated: tabela não é exposta ao frontend.
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy permissiva para clientes (service_role ignora RLS).

CREATE TRIGGER trg_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2) feature_access
CREATE TABLE public.feature_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL REFERENCES public.feature_flags(feature_key) ON UPDATE CASCADE ON DELETE CASCADE,
  user_id uuid NOT NULL,
  company_id uuid,
  sst_manager_id uuid,
  plan_id uuid,
  enabled boolean NOT NULL DEFAULT true,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  note text,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_access_validity_chk CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX idx_feature_access_user_feature ON public.feature_access (user_id, feature_key);
CREATE INDEX idx_feature_access_feature ON public.feature_access (feature_key);

-- Proteção contra duplicidade equivalente (company_id NULL vs preenchido)
CREATE UNIQUE INDEX uq_feature_access_user_feature_company
  ON public.feature_access (user_id, feature_key, company_id)
  WHERE company_id IS NOT NULL;

CREATE UNIQUE INDEX uq_feature_access_user_feature_global
  ON public.feature_access (user_id, feature_key)
  WHERE company_id IS NULL;

-- Sem GRANT para anon/authenticated: frontend nunca lê nem escreve nesta tabela.
GRANT ALL ON public.feature_access TO service_role;
ALTER TABLE public.feature_access ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy permissiva para clientes.

CREATE TRIGGER trg_feature_access_updated_at
BEFORE UPDATE ON public.feature_access
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3) has_feature_access — usuário SEMPRE de auth.uid()
CREATE OR REPLACE FUNCTION public.has_feature_access(_feature_key text, _company_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.feature_access fa
    JOIN public.feature_flags ff ON ff.feature_key = fa.feature_key
    WHERE fa.user_id = auth.uid()
      AND fa.feature_key = _feature_key
      AND fa.enabled = true
      AND ff.enabled = true
      AND fa.valid_from <= now()
      AND (fa.valid_to IS NULL OR fa.valid_to >= now())
      AND (fa.company_id IS NULL OR _company_id IS NULL OR fa.company_id = _company_id)
  );
$$;

REVOKE ALL ON FUNCTION public.has_feature_access(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_feature_access(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_feature_access(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_feature_access(text, uuid) TO service_role;

-- 4) Verificação administrativa (somente service_role)
CREATE OR REPLACE FUNCTION public.admin_has_feature_access(_user_id uuid, _feature_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.feature_access fa
    JOIN public.feature_flags ff ON ff.feature_key = fa.feature_key
    WHERE fa.user_id = _user_id
      AND fa.feature_key = _feature_key
      AND fa.enabled = true
      AND ff.enabled = true
      AND fa.valid_from <= now()
      AND (fa.valid_to IS NULL OR fa.valid_to >= now())
  );
$$;

REVOKE ALL ON FUNCTION public.admin_has_feature_access(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_has_feature_access(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_has_feature_access(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_has_feature_access(uuid, text) TO service_role;

-- 5) ltcat_audit_log
CREATE TABLE public.ltcat_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL DEFAULT 'LTCAT_BETA',
  user_id uuid,
  company_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  page_path text,
  success boolean NOT NULL DEFAULT true,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ltcat_audit_log_created ON public.ltcat_audit_log (created_at DESC);
CREATE INDEX idx_ltcat_audit_log_company ON public.ltcat_audit_log (company_id);

GRANT SELECT ON public.ltcat_audit_log TO authenticated;
GRANT ALL ON public.ltcat_audit_log TO service_role;
ALTER TABLE public.ltcat_audit_log ENABLE ROW LEVEL SECURITY;

-- Leitura apenas para quem tem a feature E vínculo com a empresa (ou registro sem empresa próprio)
CREATE POLICY "Beta users read own ltcat audit"
ON public.ltcat_audit_log
FOR SELECT
TO authenticated
USING (
  public.has_feature_access('LTCAT_BETA')
  AND (
    (company_id IS NOT NULL AND (public.user_in_company(auth.uid(), company_id) OR public.user_manages_company(auth.uid(), company_id)))
    OR (company_id IS NULL AND user_id = auth.uid())
  )
);
-- Escrita apenas por service_role (edge functions).

-- 6) beta_feedback
CREATE TABLE public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL DEFAULT 'LTCAT_BETA',
  user_id uuid NOT NULL,
  page text,
  category text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT beta_feedback_category_chk CHECK (category IN ('BUG','UX','LEGAL_RULE','PDF','DATA','PERFORMANCE','SUGGESTION')),
  CONSTRAINT beta_feedback_severity_chk CHECK (severity IN ('low','medium','high','critical'))
);

CREATE INDEX idx_beta_feedback_user ON public.beta_feedback (user_id, feature_key);

GRANT SELECT, INSERT ON public.beta_feedback TO authenticated;
GRANT ALL ON public.beta_feedback TO service_role;
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beta users insert own feedback"
ON public.beta_feedback
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND public.has_feature_access(feature_key));

CREATE POLICY "Beta users read own feedback"
ON public.beta_feedback
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND public.has_feature_access(feature_key));

CREATE TRIGGER trg_beta_feedback_updated_at
BEFORE UPDATE ON public.beta_feedback
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7) Registro da flag (restrita)
INSERT INTO public.feature_flags (feature_key, description, enabled, beta)
VALUES ('LTCAT_BETA', 'Módulo LTCAT previdenciário — beta privado restrito', true, true)
ON CONFLICT (feature_key) DO NOTHING;