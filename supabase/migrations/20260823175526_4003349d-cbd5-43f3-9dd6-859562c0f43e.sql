-- =============================================================
-- PACOTE A / M1 — Motor jurídico consultivo LTCAT + ajustes de compatibilidade
-- 1) enum: INTERNAL_GOVERNANCE_RULE (manifesto v2.1, regra EPI_EFFECT_REQUIRES_CONTEXT)
-- 2) finalize_legal_rule_version: permitir threshold LOOKUP_TABLE via metodologia (HEAT_V3/V4)
-- 3) ltcat_find_applicable_rules + resolve_legal_rule (somente consultivo)
-- =============================================================

-- 1) Novo valor de enum (não utilizado nesta mesma migration — usado apenas no seed M2)
ALTER TYPE public.legal_authority_type_enum ADD VALUE IF NOT EXISTS 'INTERNAL_GOVERNANCE_RULE';

-- 2) Finalização canônica com suporte a LOOKUP_TABLE (limite em tabela de metodologia)
CREATE OR REPLACE FUNCTION public.finalize_legal_rule_version(_version_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_ver public.legal_rule_versions%ROWTYPE;
  v_rule public.legal_rules%ROWTYPE;
  v_payload jsonb;
  v_checksum text;
  v_lookup_ok boolean;
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

  -- QUANTITATIVE/MIXED: exige threshold_value + unit, EXCETO quando o limite é
  -- tabela de consulta (LOOKUP_TABLE) vinculada a uma metodologia parametrizada
  -- (ex.: NR-15 Anexo 3 — IBUTG por regime/taxa metabólica).
  IF v_ver.criterion IN ('QUANTITATIVE','MIXED') THEN
    IF v_ver.unit IS NULL THEN
      RAISE EXCEPTION 'Versão com critério QUANTITATIVE/MIXED exige unit.';
    END IF;
    IF v_ver.threshold_value IS NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.assessment_methodologies m
        WHERE m.id = v_ver.methodology_id
          AND m.parameters_schema->>'operator' = 'LOOKUP_TABLE'
      ) INTO v_lookup_ok;
      IF NOT v_lookup_ok THEN
        RAISE EXCEPTION 'Versão com critério QUANTITATIVE/MIXED exige threshold_value, ou metodologia LOOKUP_TABLE vinculada (parameters_schema.operator = LOOKUP_TABLE).';
      END IF;
    END IF;
  END IF;

  -- Construção do payload canônico conforme CANONICAL_SET_V1
  v_payload := public.build_legal_rule_canonical_payload(_version_id);
  IF v_payload IS NULL THEN
    RAISE EXCEPTION 'Falha ao construir canonical_payload para a versão %.', _version_id;
  END IF;
  v_checksum := public.legal_checksum(v_payload);

  -- Bypass controlado da guarda de imutabilidade, somente para este UPDATE
  PERFORM set_config('ltcat.finalizing', 'on', true);
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

  PERFORM set_config('ltcat.finalizing', 'off', true);

  RETURN jsonb_build_object(
    'version_id', _version_id,
    'canonical_schema_version', 'CANONICAL_SET_V1',
    'rule_checksum', v_checksum
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.finalize_legal_rule_version(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_legal_rule_version(uuid) TO service_role;

-- 3) Resolução temporal: versões vigentes de um agente numa data
CREATE OR REPLACE FUNCTION public.ltcat_find_applicable_rules(_agent_code text, _exposure_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND NOT public.has_feature_access('LTCAT_BETA') THEN
    RETURN jsonb_build_object('outcome','ACCESS_DENIED','reason','Requer feature LTCAT_BETA');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'rule_key', r.rule_key,
    'version_id', v.id,
    'version_number', v.version_number,
    'manifest_version', v.manifest_version,
    'seed_status', v.seed_status,
    'valid_from', v.valid_from,
    'valid_to', v.valid_to,
    'criterion', v.criterion,
    'automation_level', r.automation_level
  ) ORDER BY v.valid_from), '[]'::jsonb)
  INTO v_result
  FROM public.legal_rule_versions v
  JOIN public.legal_rules r ON r.id = v.legal_rule_id
  JOIN public.occupational_agents a ON a.id = r.agent_id
  WHERE a.internal_code = _agent_code
    AND r.active
    AND v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY')
    AND v.valid_from <= _exposure_date
    AND (v.valid_to IS NULL OR v.valid_to >= _exposure_date);

  RETURN jsonb_build_object(
    'outcome', CASE WHEN jsonb_array_length(v_result) > 0 THEN 'RULE_MATCHED' ELSE 'NO_RULE_FOUND' END,
    'agent_code', _agent_code,
    'exposure_date', _exposure_date,
    'applicable_versions', v_result,
    'advisory', 'Motor consultivo — não aprova LTCAT nem conclui aposentadoria especial.'
  );
END;
$function$;

-- 4) Motor consultivo resolveLegalRule
CREATE OR REPLACE FUNCTION public.resolve_legal_rule(_rule_key text, _input jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_rule public.legal_rules%ROWTYPE;
  v_ver public.legal_rule_versions%ROWTYPE;
  v_date date;
  v_value numeric;
  v_op text;
  v_outcome text;
  v_reason text;
  v_conflicts jsonb;
  v_lookup numeric;
  v_cycle text;
  v_wl text;
  v_flags jsonb;
  v_flag text;
  v_hits text[] := '{}'::text[];
  v_known_flags text[] := ARRAY['AGENTE_COM_EXCECAO_JUDICIAL','DUVIDA_EFICACIA_EPI','CONFLITO_PPP_X_EVIDENCIAS','CANCERIGENO_OU_CONTROVERTIDO'];
  v_cat text;
  v_tr jsonb;
  v_agents jsonb;
  v_n_above int;
  v_min_years numeric;
  v_base jsonb;
BEGIN
  -- Gate: contexto de serviço (sem JWT) passa; usuário autenticado exige LTCAT_BETA ou admin
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND NOT public.has_feature_access('LTCAT_BETA') THEN
    RETURN jsonb_build_object('outcome','ACCESS_DENIED','reason','Requer feature LTCAT_BETA','rule_key',_rule_key);
  END IF;

  SELECT * INTO v_rule FROM public.legal_rules WHERE rule_key = _rule_key AND active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome','NO_RULE_FOUND','reason','Regra inexistente ou inativa','rule_key',_rule_key);
  END IF;

  BEGIN
    v_date := NULLIF(_input->>'exposure_date','')::date;
  EXCEPTION WHEN OTHERS THEN v_date := NULL;
  END;

  -- Versão aplicável
  IF v_date IS NOT NULL THEN
    SELECT * INTO v_ver FROM public.legal_rule_versions v
    WHERE v.legal_rule_id = v_rule.id
      AND v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY')
      AND v.valid_from <= v_date AND (v.valid_to IS NULL OR v.valid_to >= v_date)
    ORDER BY v.valid_from DESC LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'outcome','NO_RULE_FOUND',
        'reason','Sem versão vigente para a data da exposição',
        'rule_key',_rule_key,'exposure_date',v_date,
        'windows',(SELECT COALESCE(jsonb_agg(jsonb_build_object('from',v.valid_from,'to',v.valid_to,'seed_status',v.seed_status)),'[]'::jsonb)
                   FROM public.legal_rule_versions v
                   WHERE v.legal_rule_id = v_rule.id AND v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY')),
        'advisory','Motor consultivo — lacuna de vigência exige revisão humana.'
      );
    END IF;
  ELSE
    SELECT * INTO v_ver FROM public.legal_rule_versions v
    WHERE v.legal_rule_id = v_rule.id AND v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY')
    ORDER BY v.valid_from DESC LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('outcome','NOT_PARAMETERIZED','reason','Regra sem versão aprovada para seed','rule_key',_rule_key);
    END IF;
  END IF;

  -- Conflitos abertos/em revisão vinculados à versão
  SELECT COALESCE(jsonb_agg(jsonb_build_object('code',c.conflict_code,'status',c.status,'requires_human_review',c.requires_human_review)),'[]'::jsonb)
  INTO v_conflicts
  FROM public.legal_rule_conflicts rc
  JOIN public.legal_conflicts c ON c.id = rc.legal_conflict_id
  WHERE rc.legal_rule_version_id = v_ver.id AND c.status IN ('OPEN','UNDER_REVIEW');

  v_base := jsonb_build_object(
    'rule_key', v_rule.rule_key,
    'version_id', v_ver.id,
    'seed_status', v_ver.seed_status,
    'production_approved', v_ver.production_approved,
    'rule_checksum', v_ver.rule_checksum,
    'conflicts', v_conflicts,
    'advisory', 'Motor consultivo (FASE 2/3): não aprova LTCAT, não conclui aposentadoria especial, não publica documento.'
  );

  -- REFERENCE_ONLY: nunca decisão operacional
  IF v_ver.seed_status = 'REFERENCE_ONLY' THEN
    RETURN v_base || jsonb_build_object(
      'outcome','REFERENCE_ONLY',
      'reason','Exceção judicial documentada — jamais regra administrativa; sem resultado operacional próprio',
      'requires_human_confirmation', true);
  END IF;

  -- Conflito que exige revisão obrigatória
  IF v_ver.legal_conflict_status = 'LEGAL_CONFLICT_REQUIRES_REVIEW' THEN
    RETURN v_base || jsonb_build_object('outcome','LEGAL_CONFLICT_REQUIRES_REVIEW','reason','Versão marcada como conflito jurídico que exige revisão','requires_human_confirmation', true);
  END IF;

  v_op := COALESCE(v_ver.operator,'');
  v_outcome := NULL;
  v_reason := NULL;

  -- ---------- Roteadores especiais ----------
  IF v_rule.rule_key = 'GEN_TEMPORAL_RULE' THEN
    IF v_date IS NULL OR NULLIF(_input->>'agent_code','') IS NULL THEN
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','reason','Informe agent_code e exposure_date para a resolução temporal');
    END IF;
    RETURN v_base || jsonb_build_object('outcome','RULE_MATCHED','resolution', public.ltcat_find_applicable_rules(_input->>'agent_code', v_date));
  END IF;

  IF v_rule.rule_key = 'GEN_ANNEX_IV_SCOPE' THEN
    v_cat := upper(COALESCE(_input->>'professional_category',''));
    IF v_cat IN ('RURAL','DOMESTIC','DOMESTICA','DOMÉSTICA') THEN
      RETURN v_base || jsonb_build_object('outcome','NO_RULE_FOUND','reason','Categoria fora do âmbito do Anexo IV (cabeçalhos 1.0.0/3.0.0 — segurados urbanos)');
    END IF;
    IF (_input->>'agent_in_annex_iv') = 'false' THEN
      RETURN v_base || jsonb_build_object('outcome','NOT_PARAMETERIZED','reason','Agente ausente do Anexo IV e sem composição comprovada — rota de revisão humana (C12)','requires_human_confirmation', true);
    END IF;
    IF (_input->>'agent_in_annex_iv') = 'true' THEN
      v_outcome := 'RULE_MATCHED'; v_reason := 'Agente constante do Anexo IV — rotear para a regra do agente';
    ELSE
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','reason','Informe agent_in_annex_iv (true/false)');
    END IF;

  ELSIF v_rule.rule_key = 'EPI_EFFECT_REQUIRES_CONTEXT' THEN
    v_flags := COALESCE(_input->'epi_context_flags','[]'::jsonb);
    FOREACH v_flag IN ARRAY v_known_flags LOOP
      IF v_flags ? v_flag THEN v_hits := v_hits || v_flag; END IF;
    END LOOP;
    IF array_length(v_hits,1) IS NOT NULL THEN
      RETURN v_base || jsonb_build_object('outcome','REQUIRES_HUMAN_CONFIRMATION','reason','Disparadores de contexto EPI ativos — decisão sempre humana (matriz EPI 4 camadas)','triggers', to_jsonb(v_hits),'requires_human_confirmation', true);
    END IF;
    v_outcome := 'RULE_MATCHED'; v_reason := 'Nenhum disparador de contexto EPI';

  ELSIF v_rule.rule_key = 'EPI_NOISE_EXCEPTION' THEN
    IF (_input->>'epi_effective_declared') = 'true' THEN
      v_outcome := 'RULE_MATCHED'; v_reason := 'EPI eficaz ignorado para ruído (Tema 555/STF II + IN 128/2022 art. 290 p.u.)'; 
      RETURN v_base || jsonb_build_object('outcome',v_outcome,'reason',v_reason,'epi_override','IGNORED_NOISE');
    END IF;
    RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','reason','Sem declaração de EPI eficaz para ruído — nada a ignorar');

  ELSIF v_rule.rule_key = 'EXCEPTIONAL_LEGAL_OVERRIDE' THEN
    IF (_input #>> '{exceptional_record,status}') = 'VALIDATED'
       AND (_input #>> '{exceptional_record,human_validation,validated}') = 'true' THEN
      RETURN v_base || jsonb_build_object('outcome','RULE_MATCHED','reason','Registro excepcional VALIDATED por humano — reportar no S-2240 via 05.01.001','requires_human_confirmation', true,'esocial_code','05.01.001');
    END IF;
    RETURN v_base || jsonb_build_object('outcome','REQUIRES_HUMAN_CONFIRMATION','reason','Trilha excepcional: decisão sempre humana com registro mínimo validado','requires_human_confirmation', true,
      'minimum_record', jsonb_build_array('decision_type','decision_scope','process_number','issuing_body','tema_number','transito_em_julgado','period_start','period_end','worker_id','employer_cnpj','supporting_document','legal_basis_summary','human_validation','status'));

  ELSIF v_rule.rule_key = 'ASSOC_GENERAL' THEN
    v_agents := COALESCE(_input->'concurrent_agents','[]'::jsonb);
    SELECT count(*), min((elem->>'required_years')::numeric)
      INTO v_n_above, v_min_years
    FROM jsonb_array_elements(v_agents) elem
    WHERE (elem->>'above_tolerance') = 'true';
    IF v_n_above >= 2 THEN
      RETURN v_base || jsonb_build_object('outcome','RULE_MATCHED','reason','Dois ou mais agentes acima do nível de tolerância — menor tempo exigido prevalece','suggested_required_years', v_min_years,'requires_human_confirmation', true);
    ELSIF v_n_above = 1 THEN
      RETURN v_base || jsonb_build_object('outcome','NO_RULE_FOUND','reason','Apenas um agente acima do nível de tolerância — aplicar a regra própria do agente');
    END IF;
    RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','reason','Informe concurrent_agents com above_tolerance e required_years');

  ELSIF v_op = 'PRESENT_AND_VALID' THEN
    v_tr := COALESCE(_input->'technical_responsible','{}'::jsonb);
    IF NULLIF(v_tr->>'nome','') IS NOT NULL AND NULLIF(v_tr->>'cpf','') IS NOT NULL
       AND NULLIF(v_tr->>'conselho','') IS NOT NULL AND NULLIF(v_tr->>'numero_registro','') IS NOT NULL
       AND NULLIF(v_tr->>'habilitacao','') IS NOT NULL THEN
      v_outcome := 'RULE_MATCHED'; v_reason := 'Responsável técnico completo e habilitado';
    ELSE
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','reason','Responsável técnico ausente/incompleto','publication_blocked', true);
    END IF;

  ELSIF v_op = 'GT' AND v_ver.criterion IN ('QUANTITATIVE','MIXED') THEN
    BEGIN
      v_value := NULLIF(_input->>'measured_value','')::numeric;
    EXCEPTION WHEN OTHERS THEN v_value := NULL;
    END;
    IF v_value IS NULL THEN
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','reason','Medição ausente ou inválida (measured_value)');
    END IF;
    -- threshold fixo ou tabela de consulta (NR-15 Anexo 3)
    IF v_ver.threshold_value IS NOT NULL THEN
      v_lookup := v_ver.threshold_value;
    ELSE
      v_cycle := upper(COALESCE(_input->>'work_rest_cycle','')); -- CONTINUOUS | 75_25 | 50_50 | 25_75
      v_wl := upper(COALESCE(_input->>'workload',''));           -- LEVE | MODERADA | PESADA
      SELECT (m.parameters_schema #>> ARRAY['limits', v_cycle, v_wl])::numeric
        INTO v_lookup
      FROM public.assessment_methodologies m WHERE m.id = v_ver.methodology_id;
      IF v_lookup IS NULL THEN
        RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','reason','Informe work_rest_cycle (CONTINUOUS|75_25|50_50|25_75) e workload (LEVE|MODERADA|PESADA) para a tabela IBUTG');
      END IF;
    END IF;
    IF v_value > v_lookup THEN
      v_outcome := 'THRESHOLD_EXCEEDED';
      v_reason := format('valor medido %s > limite %s %s', v_value, v_lookup, COALESCE(v_ver.unit,''));
    ELSE
      v_outcome := 'THRESHOLD_NOT_EXCEEDED';
      v_reason := format('valor medido %s <= limite %s %s', v_value, v_lookup, COALESCE(v_ver.unit,''));
    END IF;
    -- MIXED (ruído 1995–1997): exige comprovação documental/laudo além da medição
    IF v_outcome = 'THRESHOLD_EXCEEDED' AND v_ver.criterion = 'MIXED'
       AND COALESCE(_input->>'evidence_present','false') <> 'true' THEN
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','reason','Nível acima do limite, mas sem comprovação documental/laudo do período','measured_value', v_value,'threshold', v_lookup,'unit', v_ver.unit);
    END IF;

  ELSIF v_op IN ('LISTED_IN','REQUIRES_PRESENT','ZONE_ROUTING') THEN
    IF v_rule.rule_key = 'RAD_ION_RULE' AND COALESCE(_input->>'evidence_present','false') <> 'true' THEN
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','reason','Radiações ionizantes exigem dosimetria/laudo de radioproteção como evidência de suporte');
    END IF;
    IF COALESCE(_input->>'activity_listed','') = 'true'
       OR (v_op = 'REQUIRES_PRESENT' AND COALESCE(_input->>'evidence_present','') = 'true') THEN
      v_outcome := 'RULE_MATCHED'; v_reason := 'Condição qualitativa atendida conforme outcome_spec da versão';
    ELSIF COALESCE(_input->>'activity_listed','') = 'false' THEN
      IF v_ver.judicial_exception AND COALESCE(_input->>'evidence_present','false') = 'true' THEN
        RETURN v_base || jsonb_build_object('outcome','LEGAL_CONFLICT_REQUIRES_REVIEW','reason','Fora do rol com evidência — órbita da exceção judicial (revisão humana obrigatória)','requires_human_confirmation', true);
      END IF;
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','reason','Atividade/condição fora do rol da versão vigente');
    ELSE
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','reason','Informe activity_listed (true/false) e/ou evidence_present');
    END IF;

  ELSE
    RETURN v_base || jsonb_build_object('outcome','NOT_PARAMETERIZED','reason','Operador/critério sem caminho de avaliação automática — rota de revisão humana','requires_human_confirmation', true);
  END IF;

  -- Órbita judicial sinalizada no contexto (HEAT_V4/Tema 323, VIB/TNU 2025, BIO/C14, Anexo IV/C12)
  IF v_outcome IS NOT NULL AND v_ver.judicial_exception AND COALESCE(_input->>'judicial_orbit','false') = 'true' THEN
    RETURN v_base || jsonb_build_object('outcome','LEGAL_CONFLICT_REQUIRES_REVIEW','reason','Caso na órbita da exceção judicial vinculada — revisão humana obrigatória','requires_human_confirmation', true,'previous_outcome', v_outcome);
  END IF;

  -- Escalação de confirmação humana
  IF v_rule.automation_level = 'HUMAN_DECISION_REQUIRED'
     AND v_outcome IN ('RULE_MATCHED','THRESHOLD_EXCEEDED','THRESHOLD_NOT_EXCEEDED') THEN
    RETURN v_base || jsonb_build_object('outcome','REQUIRES_HUMAN_CONFIRMATION','reason',COALESCE(v_reason,'') || ' — decisão sempre humana nesta regra','requires_human_confirmation', true,'previous_outcome', v_outcome);
  END IF;

  RETURN v_base || jsonb_build_object(
    'outcome', v_outcome,
    'reason', v_reason,
    'requires_human_confirmation', v_ver.human_confirmation_required,
    'measured_value', v_value,
    'threshold', v_lookup,
    'unit', v_ver.unit
  );
END;
$function$;

-- ACLs do motor
REVOKE ALL ON FUNCTION public.resolve_legal_rule(text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ltcat_find_applicable_rules(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_legal_rule(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ltcat_find_applicable_rules(text, date) TO authenticated, service_role;
