-- 1) Novos níveis de automação (usados pelo seed M2b)
ALTER TYPE public.rule_automation_level_enum ADD VALUE IF NOT EXISTS 'PARTIALLY_PARAMETERIZABLE';
ALTER TYPE public.rule_automation_level_enum ADD VALUE IF NOT EXISTS 'NOT_APPLICABLE';

-- 2) valid_from pode ser NULL (início temporal aberto — regras históricas)
ALTER TABLE public.legal_rule_versions ALTER COLUMN valid_from DROP NOT NULL;

-- 3) Vocabulário de operadores ampliado (preserva valores atuais)
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.legal_rule_versions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%operator%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.legal_rule_versions DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.legal_rule_versions
  ADD CONSTRAINT lrv_operator_vocab CHECK (
    operator IS NULL OR operator IN (
      '<', '<=', '>', '>=', '=', '!=', 'BETWEEN', 'IN', 'NOT_IN',
      'GT', 'GTE', 'LT', 'LTE', 'EQ',
      'LISTED_IN', 'REQUIRES_PRESENT', 'ZONE_ROUTING', 'PRESENT_AND_VALID',
      'ANY_TRUE', 'IGNORE', 'MIN_TIME_WINS', 'REQUIRES_VALIDATED', 'LOOKUP_TABLE'
    )
  );

-- 4) ltcat_find_applicable_rules — valid_from NULL aberto + additional_agent_codes
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
  ) ORDER BY v.valid_from ASC NULLS FIRST), '[]'::jsonb)
  INTO v_result
  FROM public.legal_rule_versions v
  JOIN public.legal_rules r ON r.id = v.legal_rule_id
  JOIN public.occupational_agents a ON a.id = r.agent_id
  WHERE (a.internal_code = _agent_code
         OR v.authority_context->'additional_agent_codes' ? _agent_code)
    AND r.active
    AND v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY')
    AND (v.valid_from IS NULL OR v.valid_from <= _exposure_date)
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

REVOKE EXECUTE ON FUNCTION public.ltcat_find_applicable_rules(text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ltcat_find_applicable_rules(text, date) TO authenticated, service_role;

-- 5) resolve_legal_rule — motor consultivo completo
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
  v_blocking jsonb;
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
  v_methodology text;
  v_sources jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)
     AND NOT public.has_feature_access('LTCAT_BETA') THEN
    RETURN jsonb_build_object('outcome','ACCESS_DENIED','result_status','ACCESS_DENIED','matched',false,'reason','Requer feature LTCAT_BETA','rule_key',_rule_key);
  END IF;

  SELECT * INTO v_rule FROM public.legal_rules WHERE rule_key = _rule_key AND active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome','NO_RULE_FOUND','result_status','NO_RULE_FOUND','matched',false,'reason','Regra inexistente ou inativa','rule_key',_rule_key);
  END IF;

  BEGIN
    v_date := NULLIF(_input->>'exposure_date','')::date;
  EXCEPTION WHEN OTHERS THEN v_date := NULL;
  END;

  IF v_date IS NOT NULL THEN
    SELECT * INTO v_ver FROM public.legal_rule_versions v
    WHERE v.legal_rule_id = v_rule.id
      AND v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY')
      AND (v.valid_from IS NULL OR v.valid_from <= v_date)
      AND (v.valid_to IS NULL OR v.valid_to >= v_date)
    ORDER BY v.valid_from DESC NULLS LAST LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'outcome','NO_RULE_FOUND','result_status','NO_RULE_FOUND','matched',false,
        'reason','Sem versão vigente para a data da exposição',
        'rule_key',_rule_key,'exposure_date',v_date,
        'windows',(SELECT COALESCE(jsonb_agg(jsonb_build_object('from',v.valid_from,'to',v.valid_to,'seed_status',v.seed_status)),'[]'::jsonb)
                   FROM public.legal_rule_versions v
                   WHERE v.legal_rule_id = v_rule.id AND v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY')),
        'missing_information', jsonb_build_array('versão vigente para a data'),
        'advisory','Motor consultivo — lacuna de vigência exige revisão humana.'
      );
    END IF;
  ELSE
    SELECT * INTO v_ver FROM public.legal_rule_versions v
    WHERE v.legal_rule_id = v_rule.id AND v.seed_status IN ('APPROVED_FOR_SEED','REFERENCE_ONLY')
    ORDER BY v.valid_from DESC NULLS LAST LIMIT 1;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('outcome','NOT_PARAMETERIZED','result_status','NOT_PARAMETERIZED','matched',false,'reason','Regra sem versão aprovada para seed','rule_key',_rule_key);
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('code',c.conflict_code,'status',c.status,'requires_human_review',c.requires_human_review)),'[]'::jsonb)
  INTO v_conflicts
  FROM public.legal_rule_conflicts rc
  JOIN public.legal_conflicts c ON c.id = rc.legal_conflict_id
  WHERE rc.legal_rule_version_id = v_ver.id AND c.status IN ('OPEN','UNDER_REVIEW');

  SELECT COALESCE(jsonb_agg(elem->>'code'),'[]'::jsonb) INTO v_blocking
  FROM jsonb_array_elements(v_conflicts) elem
  WHERE (elem->>'requires_human_review')::boolean;

  SELECT m.internal_code INTO v_methodology
  FROM public.assessment_methodologies m WHERE m.id = v_ver.methodology_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('authority_type',s.authority_type,'number',s.number,'year',s.year,'title',s.title,'role',sl.source_role) ORDER BY sl.source_role),'[]'::jsonb)
  INTO v_sources
  FROM public.legal_rule_source_links sl
  JOIN public.legal_sources s ON s.id = sl.legal_source_id
  WHERE sl.legal_rule_version_id = v_ver.id;

  v_base := jsonb_build_object(
    'rule_key', v_rule.rule_key,
    'rule_version', v_ver.version_number,
    'version_id', v_ver.id,
    'manifest_version', v_ver.manifest_version,
    'seed_status', v_ver.seed_status,
    'production_approved', v_ver.production_approved,
    'rule_checksum', v_ver.rule_checksum,
    'operator', v_ver.operator,
    'unit', v_ver.unit,
    'methodology', v_methodology,
    'human_confirmation_required', v_ver.human_confirmation_required,
    'judicial_exception', v_ver.judicial_exception,
    'legal_conflict', v_ver.legal_conflict_status,
    'conflicts', v_conflicts,
    'blocking_conflicts', v_blocking,
    'source_references', v_sources,
    'advisory', 'Motor consultivo: não concede aposentadoria especial, não substitui o responsável técnico e não publica conclusão final.'
  );

  IF v_ver.seed_status = 'REFERENCE_ONLY' THEN
    RETURN v_base || jsonb_build_object(
      'outcome','REFERENCE_ONLY','result_status','REFERENCE_ONLY','matched',false,
      'reason','Exceção judicial documentada — jamais regra administrativa; sem resultado operacional próprio',
      'reasoning_summary','Versão de referência histórica/judicial; não produz conclusão.',
      'requires_human_confirmation', true);
  END IF;

  IF v_ver.legal_conflict_status = 'LEGAL_CONFLICT_REQUIRES_REVIEW'
     OR jsonb_array_length(v_blocking) > 0 THEN
    RETURN v_base || jsonb_build_object(
      'outcome','LEGAL_CONFLICT_REQUIRES_REVIEW','result_status','LEGAL_CONFLICT_REQUIRES_REVIEW','matched',false,
      'reason','Versão vinculada a conflito jurídico que exige revisão humana — conclusão automática vedada',
      'reasoning_summary','Conflito(s) bloqueante(s): ' || v_blocking::text,
      'requires_human_confirmation', true);
  END IF;

  v_op := COALESCE(v_ver.operator,'');
  v_outcome := NULL;
  v_reason := NULL;

  IF v_rule.rule_key = 'GEN_TEMPORAL_RULE' THEN
    IF v_date IS NULL OR NULLIF(_input->>'agent_code','') IS NULL THEN
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','result_status','INCONCLUSIVE','matched',false,'reason','Informe agent_code e exposure_date para a resolução temporal','missing_information',jsonb_build_array('agent_code','exposure_date'));
    END IF;
    RETURN v_base || jsonb_build_object('outcome','RULE_MATCHED','result_status','RULE_MATCHED','matched',true,'reasoning_summary','Resolução temporal executada','resolution', public.ltcat_find_applicable_rules(_input->>'agent_code', v_date));
  END IF;

  IF v_rule.rule_key = 'GEN_ANNEX_IV_SCOPE' THEN
    v_cat := upper(COALESCE(_input->>'professional_category',''));
    IF v_cat IN ('RURAL','DOMESTIC','DOMESTICA','DOMÉSTICA') THEN
      RETURN v_base || jsonb_build_object('outcome','NO_RULE_FOUND','result_status','NO_RULE_FOUND','matched',false,'reason','Categoria fora do âmbito do Anexo IV (cabeçalhos 1.0.0/3.0.0 — segurados urbanos)');
    END IF;
    IF (_input->>'agent_in_annex_iv') = 'false' THEN
      RETURN v_base || jsonb_build_object('outcome','NOT_PARAMETERIZED','result_status','NOT_PARAMETERIZED','matched',false,'reason','Agente ausente do Anexo IV e sem composição comprovada — rota de revisão humana (C12)','requires_human_confirmation', true);
    END IF;
    IF (_input->>'agent_in_annex_iv') = 'true' THEN
      v_outcome := 'RULE_MATCHED'; v_reason := 'Agente constante do Anexo IV — rotear para a regra do agente';
    ELSE
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','result_status','INCONCLUSIVE','matched',false,'reason','Informe agent_in_annex_iv (true/false)','missing_information',jsonb_build_array('agent_in_annex_iv'));
    END IF;

  ELSIF v_rule.rule_key = 'EPI_EFFECT_REQUIRES_CONTEXT' OR v_op = 'ANY_TRUE' THEN
    v_flags := COALESCE(_input->'epi_context_flags','[]'::jsonb);
    FOREACH v_flag IN ARRAY v_known_flags LOOP
      IF v_flags ? v_flag THEN v_hits := v_hits || v_flag; END IF;
    END LOOP;
    IF array_length(v_hits,1) IS NOT NULL THEN
      RETURN v_base || jsonb_build_object('outcome','REQUIRES_HUMAN_CONFIRMATION','result_status','REQUIRES_HUMAN_CONFIRMATION','matched',false,'reason','Disparadores de contexto EPI ativos — decisão sempre humana (matriz EPI 4 camadas)','triggers', to_jsonb(v_hits),'requires_human_confirmation', true);
    END IF;
    v_outcome := 'RULE_MATCHED'; v_reason := 'Nenhum disparador de contexto EPI';

  ELSIF v_rule.rule_key = 'EPI_NOISE_EXCEPTION' OR v_op = 'IGNORE' THEN
    IF (_input->>'epi_effective_declared') = 'true' THEN
      v_outcome := 'RULE_MATCHED'; v_reason := 'EPI eficaz ignorado para ruído (Tema 555/STF II + IN 128/2022 art. 290 p.u.)';
      RETURN v_base || jsonb_build_object('outcome',v_outcome,'result_status',v_outcome,'matched',true,'reason',v_reason,'reasoning_summary',v_reason,'epi_override','IGNORED_NOISE');
    END IF;
    RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','result_status','INCONCLUSIVE','matched',false,'reason','Sem declaração de EPI eficaz para ruído — nada a ignorar','missing_information',jsonb_build_array('epi_effective_declared'));

  ELSIF v_rule.rule_key = 'EXCEPTIONAL_LEGAL_OVERRIDE' OR v_op = 'REQUIRES_VALIDATED' THEN
    IF (_input #>> '{exceptional_record,status}') = 'VALIDATED'
       AND (_input #>> '{exceptional_record,human_validation,validated}') = 'true' THEN
      RETURN v_base || jsonb_build_object('outcome','RULE_MATCHED','result_status','RULE_MATCHED','matched',true,'reason','Registro excepcional VALIDATED por humano — reportar no S-2240 via 05.01.001','requires_human_confirmation', true,'esocial_code','05.01.001');
    END IF;
    RETURN v_base || jsonb_build_object('outcome','REQUIRES_HUMAN_CONFIRMATION','result_status','REQUIRES_HUMAN_CONFIRMATION','matched',false,'reason','Trilha excepcional: decisão sempre humana com registro mínimo validado','requires_human_confirmation', true,
      'minimum_record', jsonb_build_array('decision_type','decision_scope','process_number','issuing_body','tema_number','transito_em_julgado','period_start','period_end','worker_id','employer_cnpj','supporting_document','legal_basis_summary','human_validation','status'));

  ELSIF v_rule.rule_key = 'ASSOC_GENERAL' OR v_op = 'MIN_TIME_WINS' THEN
    v_agents := COALESCE(_input->'concurrent_agents','[]'::jsonb);
    SELECT count(*), min((elem->>'required_years')::numeric)
      INTO v_n_above, v_min_years
    FROM jsonb_array_elements(v_agents) elem
    WHERE (elem->>'above_tolerance') = 'true';
    IF v_n_above >= 2 THEN
      RETURN v_base || jsonb_build_object('outcome','RULE_MATCHED','result_status','RULE_MATCHED','matched',true,'reason','Dois ou mais agentes acima do nível de tolerância — menor tempo exigido prevalece','suggested_required_years', v_min_years,'requires_human_confirmation', true);
    ELSIF v_n_above = 1 THEN
      RETURN v_base || jsonb_build_object('outcome','NO_RULE_FOUND','result_status','NO_RULE_FOUND','matched',false,'reason','Apenas um agente acima do nível de tolerância — aplicar a regra própria do agente');
    END IF;
    RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','result_status','INCONCLUSIVE','matched',false,'reason','Informe concurrent_agents com above_tolerance e required_years','missing_information',jsonb_build_array('concurrent_agents'));

  ELSIF v_op = 'PRESENT_AND_VALID' THEN
    v_tr := COALESCE(_input->'technical_responsible','{}'::jsonb);
    IF NULLIF(v_tr->>'nome','') IS NOT NULL AND NULLIF(v_tr->>'cpf','') IS NOT NULL
       AND NULLIF(v_tr->>'conselho','') IS NOT NULL AND NULLIF(v_tr->>'numero_registro','') IS NOT NULL
       AND NULLIF(v_tr->>'habilitacao','') IS NOT NULL THEN
      v_outcome := 'RULE_MATCHED'; v_reason := 'Responsável técnico completo e habilitado';
    ELSE
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','result_status','INCONCLUSIVE','matched',false,'reason','Responsável técnico ausente/incompleto','publication_blocked', true,'missing_information',jsonb_build_array('technical_responsible completo'));
    END IF;

  ELSIF v_op IN ('GT','>','GTE','>=') AND v_ver.criterion IN ('QUANTITATIVE','MIXED') THEN
    BEGIN
      v_value := NULLIF(_input->>'measured_value','')::numeric;
    EXCEPTION WHEN OTHERS THEN v_value := NULL;
    END;
    IF v_value IS NULL THEN
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','result_status','INCONCLUSIVE','matched',false,'reason','Medição ausente ou inválida (measured_value)','missing_information',jsonb_build_array('measured_value'));
    END IF;
    IF v_ver.threshold_value IS NOT NULL THEN
      v_lookup := v_ver.threshold_value;
    ELSE
      v_cycle := upper(COALESCE(_input->>'work_rest_cycle',''));
      v_wl := upper(COALESCE(_input->>'workload',''));
      SELECT (m.parameters_schema #>> ARRAY['limits', v_cycle, v_wl])::numeric
        INTO v_lookup
      FROM public.assessment_methodologies m WHERE m.id = v_ver.methodology_id;
      IF v_lookup IS NULL THEN
        RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','result_status','INCONCLUSIVE','matched',false,'reason','Informe work_rest_cycle (CONTINUOUS|75_25|50_50|25_75) e workload (LEVE|MODERADA|PESADA) para a tabela IBUTG','missing_information',jsonb_build_array('work_rest_cycle','workload'));
      END IF;
    END IF;
    -- Desvio C5 (NOISE): q=3 × q=5; sem q declarado e valor a <= 3 dB do limite -> humano
    IF v_rule.rule_key LIKE 'NOISE\_%' ESCAPE '\'
       AND NULLIF(_input->>'q','') IS NULL
       AND abs(v_value - v_lookup) <= 3 THEN
      RETURN v_base || jsonb_build_object(
        'outcome','REQUIRES_HUMAN_CONFIRMATION','result_status','REQUIRES_HUMAN_CONFIRMATION','matched',false,
        'reason','Desvio C5: fator de duplicação (q) não declarado e valor medido a <= 3 dB do limite — conflito interno NR-15 (q=3 × q=5) exige confirmação humana',
        'measured_value', v_value, 'threshold', v_lookup, 'unit', v_ver.unit,
        'missing_information', jsonb_build_array('q (fator de duplicação: 3 ou 5)'),
        'requires_human_confirmation', true);
    END IF;
    IF v_value > v_lookup THEN
      v_outcome := 'THRESHOLD_EXCEEDED';
      v_reason := format('valor medido %s > limite %s %s', v_value, v_lookup, COALESCE(v_ver.unit,''));
    ELSE
      v_outcome := 'THRESHOLD_NOT_EXCEEDED';
      v_reason := format('valor medido %s <= limite %s %s', v_value, v_lookup, COALESCE(v_ver.unit,''));
    END IF;
    IF v_outcome = 'THRESHOLD_EXCEEDED' AND v_ver.criterion = 'MIXED'
       AND COALESCE(_input->>'evidence_present','false') <> 'true' THEN
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','result_status','INCONCLUSIVE','matched',false,'reason','Nível acima do limite, mas sem comprovação documental/laudo do período','measured_value', v_value,'threshold', v_lookup,'unit', v_ver.unit,'missing_information',jsonb_build_array('evidence_present'));
    END IF;

  ELSIF v_op IN ('LISTED_IN','REQUIRES_PRESENT','ZONE_ROUTING','IN') THEN
    IF v_rule.rule_key = 'RAD_ION_RULE' AND COALESCE(_input->>'evidence_present','false') <> 'true' THEN
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','result_status','INCONCLUSIVE','matched',false,'reason','Radiações ionizantes exigem dosimetria/laudo de radioproteção como evidência de suporte','missing_information',jsonb_build_array('evidence_present (dosimetria/laudo)'));
    END IF;
    IF COALESCE(_input->>'activity_listed','') = 'true'
       OR (v_op = 'REQUIRES_PRESENT' AND COALESCE(_input->>'evidence_present','') = 'true') THEN
      v_outcome := 'RULE_MATCHED'; v_reason := 'Condição qualitativa atendida conforme outcome_spec da versão';
    ELSIF COALESCE(_input->>'activity_listed','') = 'false' THEN
      IF v_ver.judicial_exception AND COALESCE(_input->>'evidence_present','false') = 'true' THEN
        RETURN v_base || jsonb_build_object('outcome','LEGAL_CONFLICT_REQUIRES_REVIEW','result_status','LEGAL_CONFLICT_REQUIRES_REVIEW','matched',false,'reason','Fora do rol com evidência — órbita da exceção judicial (revisão humana obrigatória)','requires_human_confirmation', true);
      END IF;
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','result_status','INCONCLUSIVE','matched',false,'reason','Atividade/condição fora do rol da versão vigente');
    ELSE
      RETURN v_base || jsonb_build_object('outcome','INCONCLUSIVE','result_status','INCONCLUSIVE','matched',false,'reason','Informe activity_listed (true/false) e/ou evidence_present','missing_information',jsonb_build_array('activity_listed','evidence_present'));
    END IF;

  ELSE
    RETURN v_base || jsonb_build_object('outcome','NOT_PARAMETERIZED','result_status','NOT_PARAMETERIZED','matched',false,'reason','Operador/critério sem caminho de avaliação automática — rota de revisão humana','requires_human_confirmation', true);
  END IF;

  IF v_outcome IS NOT NULL AND v_ver.judicial_exception AND COALESCE(_input->>'judicial_orbit','false') = 'true' THEN
    RETURN v_base || jsonb_build_object('outcome','LEGAL_CONFLICT_REQUIRES_REVIEW','result_status','LEGAL_CONFLICT_REQUIRES_REVIEW','matched',false,'reason','Caso na órbita da exceção judicial vinculada — revisão humana obrigatória','requires_human_confirmation', true,'previous_outcome', v_outcome);
  END IF;

  IF v_rule.automation_level IN ('HUMAN_DECISION_REQUIRED','PARTIALLY_PARAMETERIZABLE')
     AND v_outcome IN ('RULE_MATCHED','THRESHOLD_EXCEEDED','THRESHOLD_NOT_EXCEEDED') THEN
    RETURN v_base || jsonb_build_object('outcome','REQUIRES_HUMAN_CONFIRMATION','result_status','REQUIRES_HUMAN_CONFIRMATION','matched',false,'reason',COALESCE(v_reason,'') || ' — decisão humana obrigatória nesta regra (' || v_rule.automation_level::text || ')','requires_human_confirmation', true,'previous_outcome', v_outcome);
  END IF;

  RETURN v_base || jsonb_build_object(
    'outcome', v_outcome,
    'result_status', v_outcome,
    'matched', v_outcome IN ('RULE_MATCHED','THRESHOLD_EXCEEDED'),
    'reason', v_reason,
    'reasoning_summary', v_reason,
    'requires_human_confirmation', v_ver.human_confirmation_required,
    'measured_value', v_value,
    'threshold', v_lookup,
    'unit', v_ver.unit
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.resolve_legal_rule(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_legal_rule(text, jsonb) TO authenticated, service_role;