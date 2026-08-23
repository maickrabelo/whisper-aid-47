CREATE OR REPLACE FUNCTION public.ltcat_user_can_access(_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_feature_access('LTCAT_BETA')
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.user_in_company(auth.uid(), _company_id)
      OR public.user_manages_company(auth.uid(), _company_id)
    );
$$;
REVOKE ALL ON FUNCTION public.ltcat_user_can_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ltcat_user_can_access(uuid) TO authenticated;

CREATE TABLE public.ltcat_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  title text NOT NULL DEFAULT 'LTCAT',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  version_number integer NOT NULL DEFAULT 1,
  parent_id uuid REFERENCES public.ltcat_documents(id) ON DELETE RESTRICT,
  responsible jsonb NOT NULL DEFAULT '{}'::jsonb,
  org_responsible jsonb NOT NULL DEFAULT '{}'::jsonb,
  reference_period_start date,
  reference_period_end date,
  emission_date date,
  additional_addresses jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  validated_at timestamptz,
  validated_payload jsonb,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ltcat_documents TO authenticated;
GRANT ALL ON public.ltcat_documents TO service_role;
ALTER TABLE public.ltcat_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ltcat_beta_company_access" ON public.ltcat_documents
  FOR ALL TO authenticated
  USING (public.ltcat_user_can_access(company_id))
  WITH CHECK (public.ltcat_user_can_access(company_id));
CREATE TRIGGER ltcat_documents_updated_at BEFORE UPDATE ON public.ltcat_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.ltcat_ghes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ltcat_id uuid NOT NULL REFERENCES public.ltcat_documents(id) ON DELETE CASCADE,
  name text NOT NULL,
  sector text,
  roles_meta jsonb NOT NULL DEFAULT '[]'::jsonb,
  activities_description text,
  worker_count integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ltcat_ghes TO authenticated;
GRANT ALL ON public.ltcat_ghes TO service_role;
ALTER TABLE public.ltcat_ghes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ltcat_ghes_beta_access" ON public.ltcat_ghes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ltcat_documents d WHERE d.id = ltcat_id AND public.ltcat_user_can_access(d.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ltcat_documents d WHERE d.id = ltcat_id AND public.ltcat_user_can_access(d.company_id)));
CREATE TRIGGER ltcat_ghes_updated_at BEFORE UPDATE ON public.ltcat_ghes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE INDEX idx_ltcat_ghes_doc ON public.ltcat_ghes(ltcat_id);

CREATE TABLE public.ltcat_exposures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ltcat_id uuid NOT NULL REFERENCES public.ltcat_documents(id) ON DELETE CASCADE,
  ghe_id uuid NOT NULL REFERENCES public.ltcat_ghes(id) ON DELETE CASCADE,
  agent_code text NOT NULL,
  agent_name text NOT NULL,
  source text NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL','PGR','AEP')),
  exposure_type text CHECK (exposure_type IN ('habitual_permanente','intermitente','eventual')),
  measured_value numeric,
  unit text,
  notes text,
  engine_rule_key text,
  engine_input jsonb,
  engine_output jsonb,
  engine_consulted_at timestamptz,
  conclusion_status text NOT NULL DEFAULT 'PENDING' CHECK (conclusion_status IN ('PENDING','RECONHECIDO','NAO_RECONHECIDO','REVISAO_HUMANA')),
  conclusion_text text,
  concluded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ltcat_exposures TO authenticated;
GRANT ALL ON public.ltcat_exposures TO service_role;
ALTER TABLE public.ltcat_exposures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ltcat_exposures_beta_access" ON public.ltcat_exposures
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ltcat_documents d WHERE d.id = ltcat_id AND public.ltcat_user_can_access(d.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ltcat_documents d WHERE d.id = ltcat_id AND public.ltcat_user_can_access(d.company_id)));
CREATE TRIGGER ltcat_exposures_updated_at BEFORE UPDATE ON public.ltcat_exposures
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE INDEX idx_ltcat_exposures_doc ON public.ltcat_exposures(ltcat_id);
CREATE INDEX idx_ltcat_exposures_ghe ON public.ltcat_exposures(ghe_id);

CREATE TABLE public.ltcat_epi_epc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ltcat_id uuid NOT NULL REFERENCES public.ltcat_documents(id) ON DELETE CASCADE,
  ghe_id uuid REFERENCES public.ltcat_ghes(id) ON DELETE CASCADE,
  exposure_id uuid REFERENCES public.ltcat_exposures(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('EPI','EPC')),
  description text NOT NULL,
  ca_number text,
  effective boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ltcat_epi_epc TO authenticated;
GRANT ALL ON public.ltcat_epi_epc TO service_role;
ALTER TABLE public.ltcat_epi_epc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ltcat_epi_epc_beta_access" ON public.ltcat_epi_epc
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ltcat_documents d WHERE d.id = ltcat_id AND public.ltcat_user_can_access(d.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ltcat_documents d WHERE d.id = ltcat_id AND public.ltcat_user_can_access(d.company_id)));
CREATE TRIGGER ltcat_epi_epc_updated_at BEFORE UPDATE ON public.ltcat_epi_epc
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE INDEX idx_ltcat_epi_epc_doc ON public.ltcat_epi_epc(ltcat_id);

CREATE TABLE public.ltcat_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ltcat_id uuid NOT NULL REFERENCES public.ltcat_documents(id) ON DELETE CASCADE,
  exposure_id uuid NOT NULL REFERENCES public.ltcat_exposures(id) ON DELETE CASCADE,
  evaluation_date date,
  methodology_code text,
  instrument_name text,
  instrument_serial text,
  calibration_date date,
  result_value numeric,
  unit text,
  report_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ltcat_evaluations TO authenticated;
GRANT ALL ON public.ltcat_evaluations TO service_role;
ALTER TABLE public.ltcat_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ltcat_evaluations_beta_access" ON public.ltcat_evaluations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ltcat_documents d WHERE d.id = ltcat_id AND public.ltcat_user_can_access(d.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ltcat_documents d WHERE d.id = ltcat_id AND public.ltcat_user_can_access(d.company_id)));
CREATE TRIGGER ltcat_evaluations_updated_at BEFORE UPDATE ON public.ltcat_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE INDEX idx_ltcat_evaluations_doc ON public.ltcat_evaluations(ltcat_id);
CREATE INDEX idx_ltcat_evaluations_exposure ON public.ltcat_evaluations(exposure_id);

CREATE TABLE public.ltcat_engine_consults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ltcat_id uuid NOT NULL REFERENCES public.ltcat_documents(id) ON DELETE CASCADE,
  exposure_id uuid REFERENCES public.ltcat_exposures(id) ON DELETE SET NULL,
  rule_key text NOT NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  consulted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ltcat_engine_consults TO authenticated;
GRANT ALL ON public.ltcat_engine_consults TO service_role;
ALTER TABLE public.ltcat_engine_consults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ltcat_consults_beta_read" ON public.ltcat_engine_consults
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ltcat_documents d WHERE d.id = ltcat_id AND public.ltcat_user_can_access(d.company_id)));
CREATE INDEX idx_ltcat_consults_doc ON public.ltcat_engine_consults(ltcat_id);

CREATE OR REPLACE FUNCTION public.ltcat_create_revision(_ltcat_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_doc public.ltcat_documents%ROWTYPE;
  v_new_id uuid;
  v_ghe record;
  v_new_ghe uuid;
  v_exp record;
  v_new_exp uuid;
BEGIN
  SELECT * INTO v_doc FROM public.ltcat_documents WHERE id = _ltcat_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LTCAT nao encontrado'; END IF;
  IF NOT public.ltcat_user_can_access(v_doc.company_id) THEN
    RAISE EXCEPTION 'Acesso negado: requer LTCAT_BETA e vinculo com a empresa';
  END IF;

  INSERT INTO public.ltcat_documents (
    company_id, title, status, version_number, parent_id,
    responsible, org_responsible,
    reference_period_start, reference_period_end,
    additional_addresses, notes, created_by
  ) VALUES (
    v_doc.company_id, v_doc.title, 'draft',
    (SELECT COALESCE(MAX(version_number), 0) + 1
       FROM public.ltcat_documents
      WHERE company_id = v_doc.company_id AND title = v_doc.title),
    _ltcat_id,
    v_doc.responsible, v_doc.org_responsible,
    v_doc.reference_period_start, v_doc.reference_period_end,
    v_doc.additional_addresses, v_doc.notes, auth.uid()
  ) RETURNING id INTO v_new_id;

  FOR v_ghe IN SELECT * FROM public.ltcat_ghes WHERE ltcat_id = _ltcat_id ORDER BY sort_order, created_at LOOP
    INSERT INTO public.ltcat_ghes (ltcat_id, name, sector, roles_meta, activities_description, worker_count, sort_order)
    VALUES (v_new_id, v_ghe.name, v_ghe.sector, v_ghe.roles_meta, v_ghe.activities_description, v_ghe.worker_count, v_ghe.sort_order)
    RETURNING id INTO v_new_ghe;

    FOR v_exp IN SELECT * FROM public.ltcat_exposures WHERE ghe_id = v_ghe.id ORDER BY created_at LOOP
      INSERT INTO public.ltcat_exposures (
        ltcat_id, ghe_id, agent_code, agent_name, source, exposure_type,
        measured_value, unit, notes,
        engine_rule_key, engine_input, engine_output, engine_consulted_at,
        conclusion_status, conclusion_text, concluded_at
      ) VALUES (
        v_new_id, v_new_ghe, v_exp.agent_code, v_exp.agent_name, v_exp.source, v_exp.exposure_type,
        v_exp.measured_value, v_exp.unit, v_exp.notes,
        v_exp.engine_rule_key, v_exp.engine_input, v_exp.engine_output, v_exp.engine_consulted_at,
        v_exp.conclusion_status, v_exp.conclusion_text, v_exp.concluded_at
      ) RETURNING id INTO v_new_exp;

      INSERT INTO public.ltcat_evaluations (
        ltcat_id, exposure_id, evaluation_date, methodology_code,
        instrument_name, instrument_serial, calibration_date,
        result_value, unit, report_reference, notes
      )
      SELECT v_new_id, v_new_exp, evaluation_date, methodology_code,
             instrument_name, instrument_serial, calibration_date,
             result_value, unit, report_reference, notes
        FROM public.ltcat_evaluations WHERE exposure_id = v_exp.id;
    END LOOP;

    INSERT INTO public.ltcat_epi_epc (ltcat_id, ghe_id, exposure_id, type, description, ca_number, effective, notes)
    SELECT v_new_id, v_new_ghe, NULL, type, description, ca_number, effective, notes
      FROM public.ltcat_epi_epc WHERE ghe_id = v_ghe.id;
  END LOOP;

  INSERT INTO public.ltcat_epi_epc (ltcat_id, ghe_id, exposure_id, type, description, ca_number, effective, notes)
  SELECT v_new_id, NULL, NULL, type, description, ca_number, effective, notes
    FROM public.ltcat_epi_epc WHERE ltcat_id = _ltcat_id AND ghe_id IS NULL;

  RETURN v_new_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.ltcat_create_revision(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ltcat_create_revision(uuid) TO authenticated;