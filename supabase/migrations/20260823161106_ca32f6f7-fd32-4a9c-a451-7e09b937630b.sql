-- Fix linter warnings introduzidos pela Fase 2B.1

-- 1. build_legal_rule_canonical_payload não precisa de SECURITY DEFINER:
--    as tabelas jurídicas já têm SELECT policy para usuários beta e o
--    service_role ignora RLS. INVOKER respeita o isolamento por RLS.
ALTER FUNCTION public.build_legal_rule_canonical_payload(uuid) SECURITY INVOKER;

-- 2. Funções de trigger não são chamadas via API: revoga EXECUTE direto.
--    (Triggers não verificam privilégio EXECUTE ao disparar — revogar é seguro.)
REVOKE EXECUTE ON FUNCTION public.legal_audit_log_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.legal_rule_versions_prevent_overlap() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.legal_rule_versions_guard() FROM PUBLIC, anon, authenticated;