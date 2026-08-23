-- ============================================================================
-- FASE 2B.1 — SCHEMA DO MOTOR JURÍDICO LTCAT (SEM SEED)
-- ZERO INSERT de regras, agentes, fontes, metodologias, limites ou códigos.
-- Somente estrutura: enums, tabelas, constraints, índices, FKs, RLS, triggers
-- e funções de suporte (checksum, payload canônico, imutabilidade, auditoria).
-- ============================================================================

-- =============================================================
-- 0. ENUMS (valores estruturais indispensáveis)
-- =============================================================
CREATE TYPE public.agent_category_enum AS ENUM (
  'PHYSICAL', 'CHEMICAL', 'BIOLOGICAL', 'ASSOCIATION', 'OTHER'
);

CREATE TYPE public.catalog_type_enum AS ENUM (
  'ESOCIAL_TABLE_24', 'DEC_3048_ANNEX_IV',
  'HISTORICAL_DECREE_53831', 'HISTORICAL_DECREE_83080',
  'NR15', 'NR16', 'CAS', 'OTHER'
);

CREATE TYPE public.legal_authority_type_enum AS ENUM (
  'LAW', 'DECREE', 'ADMINISTRATIVE_INSTRUCTION', 'ESOCIAL_RULE',
  'TECHNICAL_STANDARD', 'STF_PRECEDENT', 'STJ_PRECEDENT',
  'TNU_PRECEDENT', 'OTHER_JUDICIAL_PRECEDENT'
);

CREATE TYPE public.legal_rule_domain_enum AS ENUM (
  'SOCIAL_SECURITY', 'NR15_INSALUBRIDADE', 'NR16_PERICULOSIDADE'
);

CREATE TYPE public.rule_criterion_enum AS ENUM (
  'QUANTITATIVE', 'QUALITATIVE', 'MIXED'
);

CREATE TYPE public.rule_seed_status_enum AS ENUM (
  'DRAFT', 'REVIEWED', 'APPROVED_FOR_SEED', 'REFERENCE_ONLY', 'BLOCKED'
);

CREATE TYPE public.rule_automation_level_enum AS ENUM (
  'SAFE_TO_AUTOMATE', 'AUTOMATE_WITH_HUMAN_CONFIRMATION',
  'HUMAN_DECISION_REQUIRED', 'NOT_SAFE_TO_AUTOMATE'
);

CREATE TYPE public.legal_conflict_status_enum AS ENUM (
  'NONE', 'RULE_WITH_JUDICIAL_EXCEPTION',
  'LEGAL_CONFLICT_REQUIRES_REVIEW', 'NOT_PARAMETERIZED'
);

CREATE TYPE public.legal_conflict_record_status_enum AS ENUM (
  'OPEN', 'UNDER_REVIEW', 'RESOLVED', 'SUPERSEDED'
);

CREATE TYPE public.legal_source_role_enum AS ENUM (
  'PRIMARY', 'COMPLEMENTARY', 'METHODOLOGICAL',
  'JUDICIAL_EXCEPTION', 'ESOCIAL_MAPPING', 'HISTORICAL'
);

-- =============================================================
-- 1. OCCUPATIONAL_AGENTS — catálogo interno estável (vazio)
-- =============================================================
CREATE TABLE public.occupational_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_code text NOT NULL UNIQUE,
  name text NOT NULL,
  category public.agent_category_enum NOT NULL,
  description text,
  synonyms jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.occupational_agents FROM anon, authenticated;
GRANT SELECT ON public.occupational_agents TO authenticated;
GRANT ALL ON public.occupational_agents TO service_role;
ALTER TABLE public.occupational_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LTCAT beta users can read occupational agents"
  ON public.occupational_agents FOR SELECT TO authenticated
  USING (public.has_feature_access('LTCAT_BETA'));
CREATE TRIGGER trg_occupational_agents_updated BEFORE UPDATE ON public.occupational_agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- 2. EXTERNAL_CATALOG_VERSIONS — versões de catálogos externos (vazio)
-- =============================================================
CREATE TABLE public.external_catalog_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_type public.catalog_type_enum NOT NULL,
  version_name text NOT NULL,
  source_url text,
  valid_from date,
  valid_to date,
  published_at timestamptz,
  checksum text,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ecv_validity CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
  CONSTRAINT ecv_unique_version UNIQUE (catalog_type, version_name)
);
REVOKE ALL ON public.external_catalog_versions FROM anon, authenticated;
GRANT SELECT ON public.external_catalog_versions TO authenticated;
GRANT ALL ON public.external_catalog_versions TO service_role;
ALTER TABLE public.external_catalog_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LTCAT beta users can read external catalog versions"
  ON public.external_catalog_versions FOR SELECT TO authenticated
  USING (public.has_feature_access('LTCAT_BETA'));
CREATE TRIGGER trg_external_catalog_versions_updated BEFORE UPDATE ON public.external_catalog_versions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- 3. AGENT_MAPPINGS — 1:N condicional agente interno -> códigos externos
-- =============================================================
CREATE TABLE public.agent_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.occupational_agents(id) ON DELETE RESTRICT,
  external_catalog_version_id uuid NOT NULL REFERENCES public.external_catalog_versions(id) ON DELETE RESTRICT,
  target_domain public.catalog_type_enum NOT NULL,
  external_code text NOT NULL,
  external_label text,
  valid_from date,
  valid_to date,
  mapping_condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority integer NOT NULL DEFAULT 100,
  requires_human_confirmation boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT amap_validity CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);
CREATE INDEX idx_agent_mappings_agent ON public.agent_mappings(agent_id);
CREATE INDEX idx_agent_mappings_catalog ON public.agent_mappings(external_catalog_version_id);
CREATE INDEX idx_agent_mappings_code ON public.agent_mappings(target_domain, external_code);
REVOKE ALL ON public.agent_mappings FROM anon, authenticated;
GRANT SELECT ON public.agent_mappings TO authenticated;
GRANT ALL ON public.agent_mappings TO service_role;
ALTER TABLE public.agent_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LTCAT beta users can read agent mappings"
  ON public.agent_mappings FOR SELECT TO authenticated
  USING (public.has_feature_access('LTCAT_BETA'));
CREATE TRIGGER trg_agent_mappings_updated BEFORE UPDATE ON public.agent_mappings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- 4. LEGAL_SOURCES — fontes jurídicas (vazio)
-- =============================================================
CREATE TABLE public.legal_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  authority_type public.legal_authority_type_enum NOT NULL,
  authority_level text CHECK (authority_level IS NULL OR authority_level ~ '^L[1-8]$'),
  title text NOT NULL,
  number text,
  year integer,
  issuing_body text,
  official_url text,
  publication_date date,
  effective_from date,
  effective_to date,
  description text,
  checksum text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lsrc_validity CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);
REVOKE ALL ON public.legal_sources FROM anon, authenticated;
GRANT SELECT ON public.legal_sources TO authenticated;
GRANT ALL ON public.legal_sources TO service_role;
ALTER TABLE public.legal_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LTCAT beta users can read legal sources"
  ON public.legal_sources FOR SELECT TO authenticated
  USING (public.has_feature_access('LTCAT_BETA'));
CREATE TRIGGER trg_legal_sources_updated BEFORE UPDATE ON public.legal_sources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- 5. ASSESSMENT_METHODOLOGIES — metodologias de avaliação (vazio)
-- =============================================================
CREATE TABLE public.assessment_methodologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_code text NOT NULL UNIQUE,
  name text NOT NULL,
  issuing_body text,
  version text,
  valid_from date,
  valid_to date,
  methodology_type text CHECK (methodology_type IS NULL OR methodology_type IN ('QUANTITATIVE', 'QUALITATIVE', 'MIXED')),
  parameters_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  allowed_units jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_id uuid REFERENCES public.legal_sources(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true,
  checksum text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT amet_validity CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);
REVOKE ALL ON public.assessment_methodologies FROM anon, authenticated;
GRANT SELECT ON public.assessment_methodologies TO authenticated;
GRANT ALL ON public.assessment_methodologies TO service_role;
ALTER TABLE public.assessment_methodologies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LTCAT beta users can read assessment methodologies"
  ON public.assessment_methodologies FOR SELECT TO authenticated
  USING (public.has_feature_access('LTCAT_BETA'));
CREATE TRIGGER trg_assessment_methodologies_updated BEFORE UPDATE ON public.assessment_methodologies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- 6. LEGAL_RULES — identidade lógica da regra (vazio)
-- =============================================================
CREATE TABLE public.legal_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL UNIQUE,
  domain public.legal_rule_domain_enum NOT NULL,
  agent_id uuid REFERENCES public.occupational_agents(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  authority_type public.legal_authority_type_enum,
  legal_effect_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  automation_level public.rule_automation_level_enum NOT NULL DEFAULT 'HUMAN_DECISION_REQUIRED',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_legal_rules_agent ON public.legal_rules(agent_id);
REVOKE ALL ON public.legal_rules FROM anon, authenticated;
GRANT SELECT ON public.legal_rules TO authenticated;
GRANT ALL ON public.legal_rules TO service_role;
ALTER TABLE public.legal_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LTCAT beta users can read legal rules"
  ON public.legal_rules FOR SELECT TO authenticated
  USING (public.has_feature_access('LTCAT_BETA'));
CREATE TRIGGER trg_legal_rules_updated BEFORE UPDATE ON public.legal_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- 7. LEGAL_RULE_VERSIONS — versões temporais da regra (vazio)
--    Uma versão nunca sobrescreve outra; alteração normativa = nova linha.
-- =============================================================
CREATE TABLE public.legal_rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_rule_id uuid NOT NULL REFERENCES public.legal_rules(id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number > 0),
  manifest_version text,
  valid_from date NOT NULL,
  valid_to date,
  temporal_change_type text,
  primary_source_id uuid REFERENCES public.legal_sources(id) ON DELETE RESTRICT,
  methodology_id uuid REFERENCES public.assessment_methodologies(id) ON DELETE RESTRICT,
  criterion public.rule_criterion_enum,
  evaluation_type text,
  parameter text,
  operator text CHECK (operator IS NULL OR operator IN ('<', '<=', '>', '>=', '=', '!=', 'BETWEEN', 'IN', 'NOT_IN')),
  threshold_value numeric,
  threshold_secondary numeric,
  unit text,
  epc_behavior jsonb NOT NULL DEFAULT '{}'::jsonb,
  epi_behavior jsonb NOT NULL DEFAULT '{}'::jsonb,
  outcome_spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  authority_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  judicial_exception boolean NOT NULL DEFAULT false,
  human_confirmation_required boolean NOT NULL DEFAULT true,
  legal_conflict_status public.legal_conflict_status_enum NOT NULL DEFAULT 'NONE',
  automation_level public.rule_automation_level_enum NOT NULL DEFAULT 'HUMAN_DECISION_REQUIRED',
  seed_status public.rule_seed_status_enum NOT NULL DEFAULT 'DRAFT',
  production_approved boolean NOT NULL DEFAULT false,
  canonical_payload jsonb,
  rule_checksum text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT lrv_validity CHECK (valid_to IS NULL OR valid_to >= valid_from),
  CONSTRAINT lrv_unique_version UNIQUE (legal_rule_id, version_number)
);
CREATE INDEX idx_lrv_rule ON public.legal_rule_versions(legal_rule_id);
CREATE INDEX idx_lrv_validity ON public.legal_rule_versions(valid_from, valid_to);
REVOKE ALL ON public.legal_rule_versions FROM anon, authenticated;
GRANT SELECT ON public.legal_rule_versions TO authenticated;
GRANT ALL ON public.legal_rule_versions TO service_role;
ALTER TABLE public.legal_rule_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LTCAT beta users can read legal rule versions"
  ON public.legal_rule_versions FOR SELECT TO authenticated
  USING (public.has_feature_access('LTCAT_BETA'));

-- =============================================================
-- 8. LEGAL_RULE_SOURCE_LINKS — N:N versão de regra x fontes
-- =============================================================
CREATE TABLE public.legal_rule_source_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_rule_version_id uuid NOT NULL REFERENCES public.legal_rule_versions(id) ON DELETE RESTRICT,
  legal_source_id uuid NOT NULL REFERENCES public.legal_sources(id) ON DELETE RESTRICT,
  source_role public.legal_source_role_enum NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lrsl_unique UNIQUE (legal_rule_version_id, legal_source_id, source_role)
);
CREATE INDEX idx_lrsl_version ON public.legal_rule_source_links(legal_rule_version_id);
CREATE INDEX idx_lrsl_source ON public.legal_rule_source_links(legal_source_id);
REVOKE ALL ON public.legal_rule_source_links FROM anon, authenticated;
GRANT SELECT ON public.legal_rule_source_links TO authenticated;
GRANT ALL ON public.legal_rule_source_links TO service_role;
ALTER TABLE public.legal_rule_source_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LTCAT beta users can read rule source links"
  ON public.legal_rule_source_links FOR SELECT TO authenticated
  USING (public.has_feature_access('LTCAT_BETA'));

-- =============================================================
-- 9. LEGAL_CONFLICTS + LEGAL_RULE_CONFLICTS — infraestrutura de conflitos
-- =============================================================
CREATE TABLE public.legal_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  status public.legal_conflict_record_status_enum NOT NULL DEFAULT 'OPEN',
  severity text NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  requires_human_review boolean NOT NULL DEFAULT true,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.legal_conflicts FROM anon, authenticated;
GRANT SELECT ON public.legal_conflicts TO authenticated;
GRANT ALL ON public.legal_conflicts TO service_role;
ALTER TABLE public.legal_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LTCAT beta users can read legal conflicts"
  ON public.legal_conflicts FOR SELECT TO authenticated
  USING (public.has_feature_access('LTCAT_BETA'));
CREATE TRIGGER trg_legal_conflicts_updated BEFORE UPDATE ON public.legal_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.legal_rule_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_rule_version_id uuid NOT NULL REFERENCES public.legal_rule_versions(id) ON DELETE RESTRICT,
  legal_conflict_id uuid NOT NULL REFERENCES public.legal_conflicts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lrc_unique UNIQUE (legal_rule_version_id, legal_conflict_id)
);
CREATE INDEX idx_lrc_version ON public.legal_rule_conflicts(legal_rule_version_id);
CREATE INDEX idx_lrc_conflict ON public.legal_rule_conflicts(legal_conflict_id);
REVOKE ALL ON public.legal_rule_conflicts FROM anon, authenticated;
GRANT SELECT ON public.legal_rule_conflicts TO authenticated;
GRANT ALL ON public.legal_rule_conflicts TO service_role;
ALTER TABLE public.legal_rule_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LTCAT beta users can read rule conflicts"
  ON public.legal_rule_conflicts FOR SELECT TO authenticated
  USING (public.has_feature_access('LTCAT_BETA'));

-- =============================================================
-- 10. LEGAL_RULE_AUDIT_LOG — trilha de auditoria (somente leitura beta)
-- =============================================================
CREATE TABLE public.legal_rule_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  previous_state jsonb,
  new_state jsonb,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_lral_entity ON public.legal_rule_audit_log(entity_type, entity_id);
CREATE INDEX idx_lral_changed_at ON public.legal_rule_audit_log(changed_at);
REVOKE ALL ON public.legal_rule_audit_log FROM anon, authenticated;
GRANT SELECT ON public.legal_rule_audit_log TO authenticated;
GRANT ALL ON public.legal_rule_audit_log TO service_role;
ALTER TABLE public.legal_rule_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "LTCAT beta users can read legal audit log"
  ON public.legal_rule_audit_log FOR SELECT TO authenticated
  USING (public.has_feature_access('LTCAT_BETA'));

-- =============================================================
-- 11. FUNÇÕES DE SUPORTE
-- =============================================================

-- 11a. Checksum jurídico determinístico (sha256 do canonical_payload).
-- jsonb::text é determinístico no Postgres (chaves ordenadas, espaçamento fixo).
-- O checksum depende SOMENTE do canonical_payload (sem created_at, UUIDs de
-- auditoria ou timestamps), conforme CANONICAL_SET_V1.
CREATE OR REPLACE FUNCTION public.legal_checksum(payload jsonb)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT encode(sha256(convert_to(payload::text, 'UTF8')), 'hex');
$$;
REVOKE EXECUTE ON FUNCTION public.legal_checksum(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.legal_checksum(jsonb) TO authenticated, service_role;

-- 11b. Construtor do payload canônico de uma versão de regra.
-- Campos em ordem determinística; exclui created_at/created_by/UUIDs de
-- auditoria. Inclui conflitos (códigos ordenados) e mapeamentos JURÍDICOS
-- relevantes (Anexo IV e decretos históricos — não códigos administrativos
-- de Tabela 24, que são entidade externa versionada).
CREATE OR REPLACE FUNCTION public.build_legal_rule_canonical_payload(_version_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'rule_key', r.rule_key,
    'domain', r.domain,
    'version_number', v.version_number,
    'manifest_version', v.manifest_version,
    'valid_from', v.valid_from,
    'valid_to', v.valid_to,
    'temporal_change_type', v.temporal_change_type,
    'authority_type', r.authority_type,
    'primary_source', CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
      'authority_type', s.authority_type,
      'number', s.number,
      'year', s.year,
      'title', s.title
    ) END,
    'legal_effect_scope', r.legal_effect_scope,
    'criterion', v.criterion,
    'evaluation_type', v.evaluation_type,
    'methodology_code', m.internal_code,
    'parameter', v.parameter,
    'operator', v.operator,
    'threshold_value', v.threshold_value,
    'threshold_secondary', v.threshold_secondary,
    'unit', v.unit,
    'epc_behavior', v.epc_behavior,
    'epi_behavior', v.epi_behavior,
    'outcome_spec', v.outcome_spec,
    'authority_context', v.authority_context,
    'judicial_exception', v.judicial_exception,
    'legal_conflict_status', v.legal_conflict_status,
    'conflicts', COALESCE((
      SELECT jsonb_agg(c.conflict_code ORDER BY c.conflict_code)
      FROM public.legal_rule_conflicts rc
      JOIN public.legal_conflicts c ON c.id = rc.legal_conflict_id
      WHERE rc.legal_rule_version_id = v.id
    ), '[]'::jsonb),
    'mappings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'target_domain', am.target_domain,
        'external_code', am.external_code,
        'valid_from', am.valid_from,
        'valid_to', am.valid_to
      ) ORDER BY am.target_domain, am.external_code)
      FROM public.agent_mappings am
      WHERE am.agent_id = r.agent_id
        AND am.target_domain IN ('DEC_3048_ANNEX_IV', 'HISTORICAL_DECREE_53831', 'HISTORICAL_DECREE_83080')
    ), '[]'::jsonb)
  )
  FROM public.legal_rule_versions v
  JOIN public.legal_rules r ON r.id = v.legal_rule_id
  LEFT JOIN public.legal_sources s ON s.id = v.primary_source_id
  LEFT JOIN public.assessment_methodologies m ON m.id = v.methodology_id
  WHERE v.id = _version_id;
$$;
REVOKE EXECUTE ON FUNCTION public.build_legal_rule_canonical_payload(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.build_legal_rule_canonical_payload(uuid) TO authenticated, service_role;

-- 11c. Bloqueio de vigências sobrepostas SOMENTE entre versões já aprovadas
-- (APPROVED_FOR_SEED ou production_approved) da mesma regra. Rascunhos e
-- versões em revisão podem coexistir para trabalho paralelo; regras paralelas
-- por contexto continuam possíveis via regras distintas.
CREATE OR REPLACE FUNCTION public.legal_rule_versions_prevent_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.seed_status = 'APPROVED_FOR_SEED' OR NEW.production_approved THEN
    IF EXISTS (
      SELECT 1
      FROM public.legal_rule_versions v
      WHERE v.legal_rule_id = NEW.legal_rule_id
        AND v.id <> NEW.id
        AND (v.seed_status = 'APPROVED_FOR_SEED' OR v.production_approved)
        AND daterange(v.valid_from, v.valid_to, '[]') && daterange(NEW.valid_from, NEW.valid_to, '[]')
    ) THEN
      RAISE EXCEPTION 'Vigência conflitante com outra versão aprovada da mesma regra jurídica';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_lrv_prevent_overlap
  BEFORE INSERT OR UPDATE ON public.legal_rule_versions
  FOR EACH ROW EXECUTE FUNCTION public.legal_rule_versions_prevent_overlap();

-- 11d. Imutabilidade: versão production_approved não pode ser alterada nem
-- excluída. Correção normativa exige nova linha (nova versão).
CREATE OR REPLACE FUNCTION public.legal_rule_versions_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.production_approved THEN
    RAISE EXCEPTION 'Versão aprovada para produção não pode ser excluída. Registre nova versão da regra.';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.production_approved THEN
    RAISE EXCEPTION 'Versão aprovada para produção é imutável. Alterações exigem nova versão.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_lrv_guard
  BEFORE UPDATE OR DELETE ON public.legal_rule_versions
  FOR EACH ROW EXECUTE FUNCTION public.legal_rule_versions_guard();

-- 11e. Auditoria automática de alterações em todas as entidades jurídicas.
CREATE OR REPLACE FUNCTION public.legal_audit_log_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.legal_rule_audit_log (entity_type, entity_id, action, previous_state, new_state, changed_by)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_audit_occupational_agents AFTER INSERT OR UPDATE OR DELETE ON public.occupational_agents
  FOR EACH ROW EXECUTE FUNCTION public.legal_audit_log_change();
CREATE TRIGGER trg_audit_external_catalog_versions AFTER INSERT OR UPDATE OR DELETE ON public.external_catalog_versions
  FOR EACH ROW EXECUTE FUNCTION public.legal_audit_log_change();
CREATE TRIGGER trg_audit_agent_mappings AFTER INSERT OR UPDATE OR DELETE ON public.agent_mappings
  FOR EACH ROW EXECUTE FUNCTION public.legal_audit_log_change();
CREATE TRIGGER trg_audit_legal_sources AFTER INSERT OR UPDATE OR DELETE ON public.legal_sources
  FOR EACH ROW EXECUTE FUNCTION public.legal_audit_log_change();
CREATE TRIGGER trg_audit_assessment_methodologies AFTER INSERT OR UPDATE OR DELETE ON public.assessment_methodologies
  FOR EACH ROW EXECUTE FUNCTION public.legal_audit_log_change();
CREATE TRIGGER trg_audit_legal_rules AFTER INSERT OR UPDATE OR DELETE ON public.legal_rules
  FOR EACH ROW EXECUTE FUNCTION public.legal_audit_log_change();
CREATE TRIGGER trg_audit_legal_rule_versions AFTER INSERT OR UPDATE OR DELETE ON public.legal_rule_versions
  FOR EACH ROW EXECUTE FUNCTION public.legal_audit_log_change();
CREATE TRIGGER trg_audit_legal_conflicts AFTER INSERT OR UPDATE OR DELETE ON public.legal_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.legal_audit_log_change();

-- NOTA: Nenhuma função resolveLegalRule foi criada nesta fase (item 13).
-- Nenhum dado jurídico foi inserido (item 20): tabelas nascem vazias.