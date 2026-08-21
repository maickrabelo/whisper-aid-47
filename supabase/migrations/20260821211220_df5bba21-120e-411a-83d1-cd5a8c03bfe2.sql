-- 1) Privilégios explícitos nas tabelas da Fase 1 (não altera default privileges do schema)

-- feature_flags: somente service_role
REVOKE ALL ON TABLE public.feature_flags FROM anon;
REVOKE ALL ON TABLE public.feature_flags FROM authenticated;
GRANT ALL ON TABLE public.feature_flags TO service_role;

-- feature_access: somente service_role
REVOKE ALL ON TABLE public.feature_access FROM anon;
REVOKE ALL ON TABLE public.feature_access FROM authenticated;
GRANT ALL ON TABLE public.feature_access TO service_role;

-- ltcat_audit_log: authenticated apenas SELECT
REVOKE ALL ON TABLE public.ltcat_audit_log FROM anon;
REVOKE ALL ON TABLE public.ltcat_audit_log FROM authenticated;
GRANT SELECT ON TABLE public.ltcat_audit_log TO authenticated;
GRANT ALL ON TABLE public.ltcat_audit_log TO service_role;

-- beta_feedback: authenticated apenas SELECT, INSERT
REVOKE ALL ON TABLE public.beta_feedback FROM anon;
REVOKE ALL ON TABLE public.beta_feedback FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.beta_feedback TO authenticated;
GRANT ALL ON TABLE public.beta_feedback TO service_role;

-- 2) Correção da semântica de company_id em has_feature_access
CREATE OR REPLACE FUNCTION public.has_feature_access(_feature_key text, _company_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      AND (fa.company_id IS NULL OR fa.company_id = _company_id)
  );
$function$;

REVOKE ALL ON FUNCTION public.has_feature_access(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_feature_access(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_feature_access(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_feature_access(text, uuid) TO service_role;