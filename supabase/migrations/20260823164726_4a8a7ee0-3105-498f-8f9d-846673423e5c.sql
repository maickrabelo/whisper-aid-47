-- =============================================================
-- FASE 2B.1.1 — HARDENING DE INTEGRIDADE DO MOTOR JURÍDICO
-- Correções P1 (payload canônico versionado), R2 (imutabilidade
-- semântica indireta), P3 (auditoria de origem) e privilégios.
-- SEM seed de regras. SEM resolveLegalRule.
-- =============================================================

-- -------------------------------------------------------------
-- P1.1 — canonical_schema_version em legal_rule_versions
-- -------------------------------------------------------------
ALTER TABLE public.legal_rule_versions
  ADD COLUMN IF NOT EXISTS canonical_schema_version text NOT NULL DEFAULT 'CANONICAL_SET_V1';

ALTER TABLE public.legal_rule_versions
  ADD CONSTRAINT lrv_canonical_schema_version_chk
  CHECK (canonical_schema_version ~ '^CANONICAL_SET_V[0-9]+$');

-- -------------------------------------------------------------
-- P1.2 — Função controlada de finalização (service_role apenas)
-- Valida estrutura, constrói payload conforme CANONICAL_SET_V1,
-- calcula checksum e persiste atomicamente. NÃO decide
-- enquadramento previdenciário.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_legal_rule_version(_version_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
DECLARE
  v_ver public.legal_rule_versions%ROWTYPE;
  v_rule public.legal_rules%ROWTYPE;
  v_payload jsonb;
  v_checksum text;
BEGIN
  SELECT * INTO v_ver FROM public.legal_rule_versions WHERE id = _version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versão % não encontrada.', _version_id;
  END IF;

  IF v_ver.rule_checksum IS NOT NULL THEN
    RAISE EXCEPTION 'Versão já finalizada (checksum presente). Correções exigem nova versão da regra.';
  END IF;

  SELECT * INTO v_rule FROM public.legal_rules WHERE id = v_ver.legal_rule_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Regra jurídica vinculada à versão não encontrada.';
  END IF;

  -- Validações estruturais mínimas da versão
  IF v_ver.criterion IS NULL THEN
    RAISE EXCEPTION 'Versão estruturalmente incompleta: criterion ausente.';
  END IF;
  IF v_ver.primary_source_id IS NULL THEN
    RAISE EXCEPTION 'Versão estruturalmente incompleta: primary_source_id ausente.';
  END IF;
  IF v_ver.outcome_spec IS NULL OR v_ver.outcome_spec = '{}'::jsonb THEN
    RAISE EXCEPTION 'Versão estruturalmente incompleta: outcome_spec ausente.';
  END IF;
  IF v_ver.criterion IN ('QUANTITATIVE','MIXED')
     AND (v_ver.threshold_value IS NULL OR v_ver.unit IS NULL) THEN
    RAISE EXCEPTION 'Versão com critério QUANTITATIVE/MIXED exige threshold_value e unit.';
  END IF;

  -- Construção do payload canônico conforme CANONICAL_SET_V1
  v_payload := public.build_legal_rule_canonical_payload(_version_id);
  IF v_payload IS NULL THEN
    RAISE EXCEPTION 'Falha ao construir canonical_payload para a versão %.', _version_id;
  END IF;
  v_checksum := public.legal_checksum(v_payload);

  -- Bypass controlado da guarda de imutabilidade, somente para este UPDATE
  PERFORM set_config('ltcat.finalizing', 'on', true);
  -- Origem de auditoria padrão quando o chamador (seed/migration) não definiu
  IF NULLIF(current_setting('ltcat.audit_origin', true), '') IS NULL THEN
    PERFORM set_config('ltcat.audit_origin', 'SERVICE_ROLE', true);
  END IF;
  IF NULLIF(current_setting('ltcat.audit_actor', true), '') IS NULL THEN
    PERFORM set_config('ltcat.audit_actor', 'finalize_legal_rule_version', true);
  END IF;

  UPDATE public.legal_rule_versions
     SET canonical_payload = v_payload,
         rule_checksum = v_checksum,
         canonical_schema_version = 'CANONICAL_SET_V1'
   WHERE id = _version_id;

  -- Encerra o bypass imediatamente após o UPDATE
  PERFORM set_config('ltcat.finalizing', 'off', true);

  RETURN jsonb_build_object(
    'version_id', _version_id,
    'canonical_schema_version', 'CANONICAL_SET_V1',
    'rule_checksum', v_checksum
  );
END;
$func$;

-- -------------------------------------------------------------
-- P1.3 — Guarda de imutabilidade ampliada
-- Congelada = seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY')
--             OU production_approved = true
-- -------------------------------------------------------------
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
    IF OLD.production_approved OR OLD.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY') THEN
      RAISE EXCEPTION 'Versão juridicamente congelada não pode ser excluída. Registre nova versão da regra.';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  v_frozen := OLD.production_approved OR OLD.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY');

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

-- -------------------------------------------------------------
-- R2.1 — Função auxiliar: entidade referenciada por versão congelada?
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.legal_entity_frozen(_entity_type text, _entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $func$
  SELECT CASE _entity_type
    WHEN 'legal_sources' THEN
      EXISTS (
        SELECT 1 FROM public.legal_rule_versions v
        WHERE (v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY') OR v.production_approved)
          AND v.primary_source_id = _entity_id
      ) OR EXISTS (
        SELECT 1 FROM public.legal_rule_source_links sl
        JOIN public.legal_rule_versions v ON v.id = sl.legal_rule_version_id
        WHERE (v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY') OR v.production_approved)
          AND sl.legal_source_id = _entity_id
      )
    WHEN 'assessment_methodologies' THEN
      EXISTS (
        SELECT 1 FROM public.legal_rule_versions v
        WHERE (v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY') OR v.production_approved)
          AND v.methodology_id = _entity_id
      )
    WHEN 'occupational_agents' THEN
      EXISTS (
        SELECT 1 FROM public.legal_rules r
        JOIN public.legal_rule_versions v ON v.legal_rule_id = r.id
        WHERE (v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY') OR v.production_approved)
          AND r.agent_id = _entity_id
      )
    WHEN 'agent_mappings' THEN
      EXISTS (
        SELECT 1 FROM public.agent_mappings am
        JOIN public.legal_rules r ON r.agent_id = am.agent_id
        JOIN public.legal_rule_versions v ON v.legal_rule_id = r.id
        WHERE (v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY') OR v.production_approved)
          AND am.id = _entity_id
      )
    WHEN 'legal_conflicts' THEN
      EXISTS (
        SELECT 1 FROM public.legal_rule_conflicts rc
        JOIN public.legal_rule_versions v ON v.id = rc.legal_rule_version_id
        WHERE (v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY') OR v.production_approved)
          AND rc.legal_conflict_id = _entity_id
      )
    ELSE false
  END;
$func$;

-- -------------------------------------------------------------
-- R2.2 — Triggers de imutabilidade semântica (LEGAL_MATERIAL_FIELDS)
-- Metadados administrativos (official_url, notes, active, checksum,
-- created_at, updated_at) permanecem editáveis.
-- -------------------------------------------------------------

-- legal_sources — materiais: authority_type, authority_level, title,
-- number, year, issuing_body, publication_date, effective_from,
-- effective_to, description
CREATE OR REPLACE FUNCTION public.legal_sources_material_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
BEGIN
  IF NEW.authority_type IS NOT DISTINCT FROM OLD.authority_type
     AND NEW.authority_level IS NOT DISTINCT FROM OLD.authority_level
     AND NEW.title IS NOT DISTINCT FROM OLD.title
     AND NEW.number IS NOT DISTINCT FROM OLD.number
     AND NEW.year IS NOT DISTINCT FROM OLD.year
     AND NEW.issuing_body IS NOT DISTINCT FROM OLD.issuing_body
     AND NEW.publication_date IS NOT DISTINCT FROM OLD.publication_date
     AND NEW.effective_from IS NOT DISTINCT FROM OLD.effective_from
     AND NEW.effective_to IS NOT DISTINCT FROM OLD.effective_to
     AND NEW.description IS NOT DISTINCT FROM OLD.description THEN
    RETURN NEW;
  END IF;
  IF public.legal_entity_frozen('legal_sources', OLD.id) THEN
    RAISE EXCEPTION 'Fonte jurídica referenciada por versão congelada: campos juridicamente materiais são imutáveis. Crie novo registro, nova versão da regra e recalcule o checksum.';
  END IF;
  RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_legal_sources_material_guard
  BEFORE UPDATE ON public.legal_sources
  FOR EACH ROW EXECUTE FUNCTION public.legal_sources_material_guard();

-- assessment_methodologies — materiais: internal_code, name,
-- issuing_body, version, valid_from, valid_to, methodology_type,
-- parameters_schema, allowed_units, source_id
CREATE OR REPLACE FUNCTION public.assessment_methodologies_material_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
BEGIN
  IF NEW.internal_code IS NOT DISTINCT FROM OLD.internal_code
     AND NEW.name IS NOT DISTINCT FROM OLD.name
     AND NEW.issuing_body IS NOT DISTINCT FROM OLD.issuing_body
     AND NEW.version IS NOT DISTINCT FROM OLD.version
     AND NEW.valid_from IS NOT DISTINCT FROM OLD.valid_from
     AND NEW.valid_to IS NOT DISTINCT FROM OLD.valid_to
     AND NEW.methodology_type IS NOT DISTINCT FROM OLD.methodology_type
     AND NEW.parameters_schema IS NOT DISTINCT FROM OLD.parameters_schema
     AND NEW.allowed_units IS NOT DISTINCT FROM OLD.allowed_units
     AND NEW.source_id IS NOT DISTINCT FROM OLD.source_id THEN
    RETURN NEW;
  END IF;
  IF public.legal_entity_frozen('assessment_methodologies', OLD.id) THEN
    RAISE EXCEPTION 'Metodologia referenciada por versão congelada: campos juridicamente materiais são imutáveis. Crie nova metodologia/versão e recalcule o checksum.';
  END IF;
  RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_assessment_methodologies_material_guard
  BEFORE UPDATE ON public.assessment_methodologies
  FOR EACH ROW EXECUTE FUNCTION public.assessment_methodologies_material_guard();

-- occupational_agents — materiais: internal_code, name, category,
-- synonyms, description
CREATE OR REPLACE FUNCTION public.occupational_agents_material_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
BEGIN
  IF NEW.internal_code IS NOT DISTINCT FROM OLD.internal_code
     AND NEW.name IS NOT DISTINCT FROM OLD.name
     AND NEW.category IS NOT DISTINCT FROM OLD.category
     AND NEW.synonyms IS NOT DISTINCT FROM OLD.synonyms
     AND NEW.description IS NOT DISTINCT FROM OLD.description THEN
    RETURN NEW;
  END IF;
  IF public.legal_entity_frozen('occupational_agents', OLD.id) THEN
    RAISE EXCEPTION 'Agente referenciado por versão congelada: campos juridicamente materiais são imutáveis. Crie novo agente e nova versão da regra.';
  END IF;
  RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_occupational_agents_material_guard
  BEFORE UPDATE ON public.occupational_agents
  FOR EACH ROW EXECUTE FUNCTION public.occupational_agents_material_guard();

-- agent_mappings — materiais: agent_id, external_catalog_version_id,
-- target_domain, external_code, external_label, mapping_condition,
-- valid_from, valid_to, priority, requires_human_confirmation
CREATE OR REPLACE FUNCTION public.agent_mappings_material_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
BEGIN
  IF NEW.agent_id IS NOT DISTINCT FROM OLD.agent_id
     AND NEW.external_catalog_version_id IS NOT DISTINCT FROM OLD.external_catalog_version_id
     AND NEW.target_domain IS NOT DISTINCT FROM OLD.target_domain
     AND NEW.external_code IS NOT DISTINCT FROM OLD.external_code
     AND NEW.external_label IS NOT DISTINCT FROM OLD.external_label
     AND NEW.mapping_condition IS NOT DISTINCT FROM OLD.mapping_condition
     AND NEW.valid_from IS NOT DISTINCT FROM OLD.valid_from
     AND NEW.valid_to IS NOT DISTINCT FROM OLD.valid_to
     AND NEW.priority IS NOT DISTINCT FROM OLD.priority
     AND NEW.requires_human_confirmation IS NOT DISTINCT FROM OLD.requires_human_confirmation THEN
    RETURN NEW;
  END IF;
  IF public.legal_entity_frozen('agent_mappings', OLD.id) THEN
    RAISE EXCEPTION 'Mapeamento de agente referenciado por versão congelada: campos juridicamente materiais são imutáveis. Encerre a vigência e crie novo mapeamento.';
  END IF;
  RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_agent_mappings_material_guard
  BEFORE UPDATE ON public.agent_mappings
  FOR EACH ROW EXECUTE FUNCTION public.agent_mappings_material_guard();

-- legal_conflicts — materiais: conflict_code, title, description,
-- status, severity, requires_human_review, resolved_at,
-- resolution_note. Resolução posterior NÃO reescreve o estado
-- histórico preservado no snapshot da versão congelada.
CREATE OR REPLACE FUNCTION public.legal_conflicts_material_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
BEGIN
  IF NEW.conflict_code IS NOT DISTINCT FROM OLD.conflict_code
     AND NEW.title IS NOT DISTINCT FROM OLD.title
     AND NEW.description IS NOT DISTINCT FROM OLD.description
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.severity IS NOT DISTINCT FROM OLD.severity
     AND NEW.requires_human_review IS NOT DISTINCT FROM OLD.requires_human_review
     AND NEW.resolved_at IS NOT DISTINCT FROM OLD.resolved_at
     AND NEW.resolution_note IS NOT DISTINCT FROM OLD.resolution_note THEN
    RETURN NEW;
  END IF;
  IF public.legal_entity_frozen('legal_conflicts', OLD.id) THEN
    RAISE EXCEPTION 'Conflito referenciado por versão congelada: seu estado histórico é imutável. Crie novo registro de conflito e nova versão da regra quando a mudança afetar a interpretação.';
  END IF;
  RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_legal_conflicts_material_guard
  BEFORE UPDATE ON public.legal_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.legal_conflicts_material_guard();

-- -------------------------------------------------------------
-- P3.1 — Auditoria de origem e executor
-- -------------------------------------------------------------
ALTER TABLE public.legal_rule_audit_log
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS actor_identifier text,
  ADD COLUMN IF NOT EXISTS operation_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS correlation_id uuid;

ALTER TABLE public.legal_rule_audit_log
  ADD CONSTRAINT lral_origin_chk
  CHECK (origin IN ('USER','SEED','MIGRATION','EDGE_FUNCTION','SERVICE_ROLE','SYSTEM'));

-- -------------------------------------------------------------
-- P3.2 — Trigger de auditoria atualizado
-- changed_by = auth.uid() quando há usuário; em processos sem
-- sessão humana, origin/actor_identifier vêm de GUCs de sessão
-- definidos apenas por funções server-side (não falsificáveis
-- pelo cliente, que não pode executar SQL arbitrário nem essas
-- funções internas).
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.legal_audit_log_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
DECLARE
  v_uid uuid;
  v_origin text;
  v_actor text;
  v_context jsonb;
  v_correlation uuid;
BEGIN
  v_uid := auth.uid();
  v_actor := NULLIF(current_setting('ltcat.audit_actor', true), '');

  IF v_uid IS NOT NULL THEN
    v_origin := 'USER';
  ELSE
    v_origin := COALESCE(NULLIF(current_setting('ltcat.audit_origin', true), ''), 'SYSTEM');
  END IF;

  BEGIN
    v_context := COALESCE(NULLIF(current_setting('ltcat.audit_context', true), ''), '{}')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_context := '{}'::jsonb;
  END;

  BEGIN
    v_correlation := NULLIF(current_setting('ltcat.audit_correlation_id', true), '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_correlation := NULL;
  END;

  INSERT INTO public.legal_rule_audit_log
    (entity_type, entity_id, action, previous_state, new_state, changed_by,
     origin, actor_identifier, operation_context, correlation_id)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
    v_uid, v_origin, v_actor, v_context, v_correlation
  );
  RETURN COALESCE(NEW, OLD);
END;
$func$;

-- -------------------------------------------------------------
-- PRIVILÉGIOS — funções internas fora do alcance do cliente
-- Usuário beta LÊ as regras (RLS), mas não executa builder,
-- checksum, finalizador nem helper de congelamento.
-- -------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.build_legal_rule_canonical_payload(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.legal_checksum(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_legal_rule_version(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.legal_entity_frozen(text, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.build_legal_rule_canonical_payload(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.legal_checksum(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_legal_rule_version(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.legal_entity_frozen(text, uuid) TO service_role;