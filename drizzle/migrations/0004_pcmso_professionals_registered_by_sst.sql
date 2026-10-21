ALTER TABLE public.pcmso_professional_assignments ADD COLUMN IF NOT EXISTS professional_name text;

DROP POLICY IF EXISTS pcmso_assignments_insert_own ON public.pcmso_professional_assignments;
DROP POLICY IF EXISTS pcmso_assignments_update_own ON public.pcmso_professional_assignments;
DROP POLICY IF EXISTS pcmso_assignments_select_company ON public.pcmso_professional_assignments;
CREATE POLICY pcmso_assignments_select ON public.pcmso_professional_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.pcmso_can(company_id, 'program.view'));

CREATE OR REPLACE FUNCTION public.pcmso_register_professional(
  _company_id uuid, _email text, _name text, _crm text, _crm_uf text, _role text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _doc uuid; _id uuid;
BEGIN
  IF NOT (public.pcmso_can(_company_id, 'program.prepare') AND public.user_manages_company(_uid, _company_id)) THEN
    RAISE EXCEPTION 'Sem permissão para cadastrar médicos nesta empresa' USING ERRCODE = '42501';
  END IF;
  IF _role NOT IN ('responsavel','examinador') THEN RAISE EXCEPTION 'Função inválida'; END IF;
  IF coalesce(trim(_name),'') = '' OR coalesce(trim(_crm),'') = '' OR coalesce(trim(_crm_uf),'') = '' THEN
    RAISE EXCEPTION 'Informe nome, CRM e UF';
  END IF;
  SELECT id INTO _doc FROM auth.users WHERE lower(email) = lower(trim(_email));
  IF _doc IS NULL THEN
    RAISE EXCEPTION 'MEDICO_SEM_CONTA' USING ERRCODE = 'P0002';
  END IF;
  IF _doc = _uid THEN RAISE EXCEPTION 'Você não pode se cadastrar como médico desta empresa'; END IF;
  UPDATE public.pcmso_professional_assignments SET revoked_at = now(), updated_at = now()
   WHERE company_id = _company_id AND user_id = _doc AND revoked_at IS NULL;
  INSERT INTO public.pcmso_professional_assignments(user_id, company_id, clinical_role, crm, crm_uf, professional_name, granted_by)
  VALUES (_doc, _company_id, _role, trim(_crm), upper(trim(_crm_uf)), trim(_name), _uid) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.pcmso_revoke_professional(_assignment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c uuid;
BEGIN
  SELECT company_id INTO _c FROM public.pcmso_professional_assignments WHERE id = _assignment_id;
  IF _c IS NULL OR NOT (public.pcmso_can(_c, 'program.prepare') AND public.user_manages_company(auth.uid(), _c)) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  UPDATE public.pcmso_professional_assignments SET revoked_at = now(), updated_at = now() WHERE id = _assignment_id AND revoked_at IS NULL;
END $$;

REVOKE ALL ON FUNCTION public.pcmso_register_professional(uuid,text,text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pcmso_revoke_professional(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pcmso_register_professional(uuid,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pcmso_revoke_professional(uuid) TO authenticated;