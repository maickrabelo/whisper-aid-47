CREATE OR REPLACE FUNCTION public.legal_rule_versions_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $func$
DECLARE
  v_frozen boolean;
  v_finalizing boolean;
BEGIN
  v_finalizing := COALESCE(current_setting('ltcat.finalizing', true), '') = 'on';

  IF TG_OP = 'DELETE' THEN
    IF OLD.production_approved
       OR OLD.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY')
       OR OLD.rule_checksum IS NOT NULL THEN
      RAISE EXCEPTION 'Versão juridicamente congelada não pode ser excluída. Registre nova versão da regra.';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  -- Congelada = aprovada para seed / reference-only / produção /
  -- já finalizada (checksum presente). Qualquer correção exige nova versão.
  v_frozen := OLD.production_approved
              OR OLD.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY')
              OR OLD.rule_checksum IS NOT NULL;

  IF v_frozen AND NOT v_finalizing THEN
    RAISE EXCEPTION 'Versão juridicamente congelada é imutável. Alterações exigem nova versão.';
  END IF;

  IF NOT v_frozen AND NOT v_finalizing THEN
    -- Mesmo em DRAFT/REVIEWED, payload/checksum/schema só podem ser
    -- escritos pela função finalize_legal_rule_version()
    IF NEW.canonical_payload IS DISTINCT FROM OLD.canonical_payload
       OR NEW.rule_checksum IS DISTINCT FROM OLD.rule_checksum
       OR NEW.canonical_schema_version IS DISTINCT FROM OLD.canonical_schema_version THEN
      RAISE EXCEPTION 'canonical_payload, rule_checksum e canonical_schema_version só podem ser definidos por finalize_legal_rule_version().';
    END IF;
  END IF;

  IF v_finalizing THEN
    -- Durante a finalização, apenas os campos canônicos podem mudar
    IF NEW.legal_rule_id IS DISTINCT FROM OLD.legal_rule_id
       OR NEW.version_number IS DISTINCT FROM OLD.version_number
       OR NEW.manifest_version IS DISTINCT FROM OLD.manifest_version
       OR NEW.valid_from IS DISTINCT FROM OLD.valid_from
       OR NEW.valid_to IS DISTINCT FROM OLD.valid_to
       OR NEW.criterion IS DISTINCT FROM OLD.criterion
       OR NEW.threshold_value IS DISTINCT FROM OLD.threshold_value
       OR NEW.unit IS DISTINCT FROM OLD.unit
       OR NEW.outcome_spec IS DISTINCT FROM OLD.outcome_spec
       OR NEW.seed_status IS DISTINCT FROM OLD.seed_status
       OR NEW.production_approved IS DISTINCT FROM OLD.production_approved THEN
      RAISE EXCEPTION 'Finalização não pode alterar campos estruturais da versão.';
    END IF;
  END IF;

  RETURN NEW;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.legal_rule_versions_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.legal_rule_versions_guard() TO service_role;