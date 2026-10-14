-- PCMSO Fase 1: atribuições profissionais, programas, auditoria e autorização por empresa+ação

CREATE TABLE public.pcmso_professional_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  clinical_role text NOT NULL CHECK (clinical_role IN ('responsavel','examinador')),
  crm text,
  crm_uf text,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  revoked_at timestamptz,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pcmso_professional_assignments(user_id, company_id);
GRANT SELECT, INSERT, UPDATE ON public.pcmso_professional_assignments TO authenticated;
GRANT ALL ON public.pcmso_professional_assignments TO service_role;
ALTER TABLE public.pcmso_professional_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pcmso_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_revisao','aprovado','arquivado')),
  created_by uuid DEFAULT auth.uid(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, id)
);
CREATE INDEX ON public.pcmso_programs(company_id);
GRANT SELECT, INSERT, UPDATE ON public.pcmso_programs TO authenticated;
GRANT ALL ON public.pcmso_programs TO service_role;
ALTER TABLE public.pcmso_programs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pcmso_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  company_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  result text NOT NULL DEFAULT 'ok',
  justification text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pcmso_audit_events(company_id, created_at DESC);
GRANT SELECT ON public.pcmso_audit_events TO authenticated;
GRANT ALL ON public.pcmso_audit_events TO service_role;
ALTER TABLE public.pcmso_audit_events ENABLE ROW LEVEL SECURITY;

-- Atribuição clínica ativa
CREATE OR REPLACE FUNCTION public.pcmso_has_clinical_assignment(_user_id uuid, _company_id uuid, _role text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pcmso_professional_assignments a
    WHERE a.user_id = _user_id AND a.company_id = _company_id
      AND a.revoked_at IS NULL
      AND a.valid_from <= now() AND (a.valid_to IS NULL OR a.valid_to >= now())
      AND (_role IS NULL OR a.clinical_role = _role)
  );
$$;

-- Autorização central: flag + vínculo + atribuição + ação
CREATE OR REPLACE FUNCTION public.pcmso_can(_company_id uuid, _permission text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _linked boolean;
  _sst boolean;
BEGIN
  IF _uid IS NULL OR _company_id IS NULL THEN RETURN false; END IF;
  IF NOT public.has_feature_access('PCMSO_BETA', _company_id) THEN RETURN false; END IF;

  _sst := public.user_manages_company(_uid, _company_id);
  _linked := _sst OR public.user_in_company(_uid, _company_id);

  CASE _permission
    WHEN 'program.view' THEN
      RETURN _linked OR public.pcmso_has_clinical_assignment(_uid, _company_id);
    WHEN 'program.prepare' THEN
      RETURN _sst OR public.pcmso_has_clinical_assignment(_uid, _company_id, 'responsavel');
    WHEN 'program.approve' THEN
      RETURN public.pcmso_has_clinical_assignment(_uid, _company_id, 'responsavel');
    WHEN 'clinical.read', 'clinical.write', 'aso.issue' THEN
      RETURN public.pcmso_has_clinical_assignment(_uid, _company_id);
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Empresas que o usuário atual pode ver no módulo
CREATE OR REPLACE FUNCTION public.pcmso_accessible_companies()
RETURNS TABLE(company_id uuid, company_name text, can_prepare boolean, clinical_role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name,
         public.pcmso_can(c.id, 'program.prepare'),
         (SELECT a.clinical_role FROM public.pcmso_professional_assignments a
           WHERE a.user_id = auth.uid() AND a.company_id = c.id AND a.revoked_at IS NULL
             AND a.valid_from <= now() AND (a.valid_to IS NULL OR a.valid_to >= now())
           ORDER BY (a.clinical_role = 'responsavel') DESC LIMIT 1)
  FROM public.companies c
  WHERE public.pcmso_can(c.id, 'program.view')
  ORDER BY c.name;
$$;
REVOKE EXECUTE ON FUNCTION public.pcmso_accessible_companies() FROM anon;
REVOKE EXECUTE ON FUNCTION public.pcmso_can(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.pcmso_has_clinical_assignment(uuid, uuid, text) FROM anon;

-- Políticas: programas
CREATE POLICY "pcmso programs view" ON public.pcmso_programs FOR SELECT TO authenticated
  USING (public.pcmso_can(company_id, 'program.view'));
CREATE POLICY "pcmso programs insert" ON public.pcmso_programs FOR INSERT TO authenticated
  WITH CHECK (public.pcmso_can(company_id, 'program.prepare'));
CREATE POLICY "pcmso programs update" ON public.pcmso_programs FOR UPDATE TO authenticated
  USING (public.pcmso_can(company_id, 'program.prepare'))
  WITH CHECK (public.pcmso_can(company_id, 'program.prepare'));

-- Políticas: atribuições (admin gerencia; profissional vê as próprias)
CREATE POLICY "pcmso assignments own or admin" ON public.pcmso_professional_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pcmso assignments admin insert" ON public.pcmso_professional_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pcmso assignments admin update" ON public.pcmso_professional_assignments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Políticas: auditoria (somente leitura admin; escrita só por trigger)
CREATE POLICY "pcmso audit admin read" ON public.pcmso_audit_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Guardas: company_id imutável, programa aprovado não editável, status 'aprovado' só via fluxo médico
CREATE OR REPLACE FUNCTION public.pcmso_programs_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
    IF NEW.status <> 'rascunho' THEN RAISE EXCEPTION 'Programa novo deve iniciar como rascunho'; END IF;
  ELSE
    IF NEW.company_id <> OLD.company_id THEN RAISE EXCEPTION 'Empresa do programa não pode ser alterada'; END IF;
    IF OLD.status = 'aprovado' THEN RAISE EXCEPTION 'Programa aprovado não pode ser editado; crie uma revisão'; END IF;
    IF NEW.status = 'aprovado' AND NOT public.pcmso_can(NEW.company_id, 'program.approve') THEN
      RAISE EXCEPTION 'Aprovação exige médico responsável atribuído';
    END IF;
    NEW.updated_at := now();
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pcmso_programs_guard BEFORE INSERT OR UPDATE ON public.pcmso_programs
  FOR EACH ROW EXECUTE FUNCTION public.pcmso_programs_guard();

CREATE OR REPLACE FUNCTION public.pcmso_audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.pcmso_audit_events(actor_id, company_id, action, entity, entity_id)
  VALUES (auth.uid(), NEW.company_id, lower(TG_OP), TG_TABLE_NAME, NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER pcmso_programs_audit AFTER INSERT OR UPDATE ON public.pcmso_programs
  FOR EACH ROW EXECUTE FUNCTION public.pcmso_audit_trigger();
CREATE TRIGGER pcmso_assignments_audit AFTER INSERT OR UPDATE ON public.pcmso_professional_assignments
  FOR EACH ROW EXECUTE FUNCTION public.pcmso_audit_trigger();

-- Flag do módulo, desligada por padrão
INSERT INTO public.feature_flags(feature_key, description, enabled, beta)
VALUES ('PCMSO_BETA', 'Módulo PCMSO — beta privado, desligado por padrão', false, true)
ON CONFLICT (feature_key) DO NOTHING;
