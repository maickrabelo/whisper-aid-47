CREATE TABLE public.pcmso_clinical_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), order_id uuid NOT NULL REFERENCES public.pcmso_exam_orders(id), revision integer NOT NULL CHECK(revision>0), exam_date date NOT NULL, notes text NOT NULL CHECK(length(trim(notes)) BETWEEN 3 AND 10000), procedures jsonb NOT NULL CHECK(jsonb_typeof(procedures)='array'), physician jsonb NOT NULL, actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), simulation boolean NOT NULL DEFAULT true CHECK(simulation), UNIQUE(order_id,revision)
);
GRANT ALL ON public.pcmso_clinical_entries TO service_role;
REVOKE ALL ON public.pcmso_clinical_entries FROM PUBLIC,anon,authenticated;
ALTER TABLE public.pcmso_clinical_entries ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.pcmso_asos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), order_id uuid NOT NULL REFERENCES public.pcmso_exam_orders(id), clinical_entry_id uuid NOT NULL UNIQUE REFERENCES public.pcmso_clinical_entries(id), previous_aso_id uuid REFERENCES public.pcmso_asos(id), issued_on date NOT NULL, content jsonb NOT NULL, content_hash text NOT NULL, actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), simulation boolean NOT NULL DEFAULT true CHECK(simulation)
);
GRANT ALL ON public.pcmso_asos TO service_role;
REVOKE ALL ON public.pcmso_asos FROM PUBLIC,anon,authenticated;
ALTER TABLE public.pcmso_asos ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.pcmso_manual_signature_attestations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), aso_id uuid NOT NULL UNIQUE REFERENCES public.pcmso_asos(id), signed_on date NOT NULL, reference text NOT NULL CHECK(length(trim(reference)) BETWEEN 3 AND 300), actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), simulation boolean NOT NULL DEFAULT true CHECK(simulation)
);
GRANT ALL ON public.pcmso_manual_signature_attestations TO service_role;
REVOKE ALL ON public.pcmso_manual_signature_attestations FROM PUBLIC,anon,authenticated;
ALTER TABLE public.pcmso_manual_signature_attestations ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.pcmso_annual_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), year integer NOT NULL CHECK(year BETWEEN 2000 AND 2100), revision integer NOT NULL CHECK(revision>0), content jsonb NOT NULL, content_hash text NOT NULL, actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), simulation boolean NOT NULL DEFAULT true CHECK(simulation), UNIQUE(company_id,year,revision)
);
GRANT SELECT ON public.pcmso_annual_reports TO authenticated;
GRANT ALL ON public.pcmso_annual_reports TO service_role;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.pcmso_annual_reports FROM PUBLIC,anon,authenticated;
ALTER TABLE public.pcmso_annual_reports ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.pcmso_esocial_preparations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), aso_id uuid NOT NULL UNIQUE REFERENCES public.pcmso_asos(id), event_id text NOT NULL, payload jsonb NOT NULL, content_hash text NOT NULL, status text NOT NULL DEFAULT 'preparado_nao_transmitido' CHECK(status='preparado_nao_transmitido'), schema_version text NOT NULL DEFAULT 'S-1.3 NT06/2026 2026-07-01', actor_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), simulation boolean NOT NULL DEFAULT true CHECK(simulation)
);
GRANT ALL ON public.pcmso_esocial_preparations TO service_role;
REVOKE ALL ON public.pcmso_esocial_preparations FROM PUBLIC,anon,authenticated;
ALTER TABLE public.pcmso_esocial_preparations ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.pcmso_pilot_can(_company_id uuid,_clinical boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT _company_id='052c8fc4-b377-4f86-84a5-5c581a2896e5'::uuid AND public.pcmso_exam_can(_company_id) AND public.has_feature_access('PCMSO_CLINICAL_PILOT',_company_id) AND (NOT _clinical OR public.pcmso_can(_company_id,'clinical.write'));
$$;
REVOKE ALL ON FUNCTION public.pcmso_pilot_can(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pcmso_pilot_can(uuid,boolean) TO authenticated;
CREATE POLICY annual_report_read ON public.pcmso_annual_reports FOR SELECT TO authenticated USING(public.pcmso_pilot_can(company_id,false));
CREATE OR REPLACE FUNCTION public.pcmso_append_only_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN RAISE EXCEPTION 'Evidência imutável: crie uma revisão'; END $$;
CREATE TRIGGER clinical_immutable BEFORE UPDATE OR DELETE ON public.pcmso_clinical_entries FOR EACH ROW EXECUTE FUNCTION public.pcmso_append_only_guard();
CREATE TRIGGER aso_immutable BEFORE UPDATE OR DELETE ON public.pcmso_asos FOR EACH ROW EXECUTE FUNCTION public.pcmso_append_only_guard();
CREATE TRIGGER signature_immutable BEFORE UPDATE OR DELETE ON public.pcmso_manual_signature_attestations FOR EACH ROW EXECUTE FUNCTION public.pcmso_append_only_guard();
CREATE TRIGGER annual_immutable BEFORE UPDATE OR DELETE ON public.pcmso_annual_reports FOR EACH ROW EXECUTE FUNCTION public.pcmso_append_only_guard();
CREATE TRIGGER esocial_preparation_immutable BEFORE UPDATE OR DELETE ON public.pcmso_esocial_preparations FOR EACH ROW EXECUTE FUNCTION public.pcmso_append_only_guard();
CREATE OR REPLACE FUNCTION public.pcmso_pilot_clinical_read(_company_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.pcmso_pilot_can(_company_id,true) THEN RAISE EXCEPTION 'Acesso exclusivo ao médico atribuído no piloto' USING ERRCODE='42501'; END IF;
 INSERT INTO public.pcmso_audit_events(actor_id,company_id,action,entity) VALUES(auth.uid(),_company_id,'clinical.read','pcmso_clinical_entries');
 RETURN jsonb_build_object('entries',coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY created_at DESC) FROM public.pcmso_clinical_entries e WHERE company_id=_company_id),'[]'::jsonb),'asos',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'order_id',a.order_id,'clinical_entry_id',a.clinical_entry_id,'issued_on',a.issued_on,'signed_on',s.signed_on) ORDER BY a.created_at DESC) FROM public.pcmso_asos a LEFT JOIN public.pcmso_manual_signature_attestations s ON s.aso_id=a.id WHERE a.company_id=_company_id),'[]'::jsonb));
END $$;
CREATE OR REPLACE FUNCTION public.pcmso_pilot_record_encounter(_order_id uuid,_exam_date date,_notes text,_procedures jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.pcmso_exam_orders; ph jsonb; eid uuid; item jsonb; rev integer;
BEGIN
 SELECT * INTO o FROM public.pcmso_exam_orders WHERE id=_order_id FOR UPDATE;
 IF o.id IS NULL OR NOT public.pcmso_pilot_can(o.company_id,true) THEN RAISE EXCEPTION 'Sem autorização médica' USING ERRCODE='42501'; END IF;
 IF o.status<>'compareceu' THEN RAISE EXCEPTION 'Registre o comparecimento antes do atendimento'; END IF;
 IF _exam_date IS NULL OR _exam_date>current_date OR _exam_date<o.scheduled_date OR length(trim(coalesce(_notes,''))) NOT BETWEEN 3 AND 10000 THEN RAISE EXCEPTION 'Informe data válida e registro clínico'; END IF;
 IF _procedures IS NULL OR jsonb_typeof(_procedures)<>'array' THEN RAISE EXCEPTION 'Informe procedimentos'; END IF;
 IF jsonb_array_length(_procedures) NOT BETWEEN 1 AND 99 THEN RAISE EXCEPTION 'Informe de 1 a 99 procedimentos'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(_procedures) LOOP
  IF coalesce(item->>'code','') !~ '^\d{4}$' OR coalesce(item->>'name','')='' OR coalesce(item->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Procedimento incompleto'; END IF;
  IF (item->>'date')::date>_exam_date THEN RAISE EXCEPTION 'Exame posterior ao atendimento'; END IF;
 END LOOP;
 SELECT jsonb_build_object('name',professional_name,'crm',crm,'crm_uf',crm_uf,'user_id',user_id,'assignment_id',id) INTO ph FROM public.pcmso_professional_assignments WHERE user_id=auth.uid() AND company_id=o.company_id AND revoked_at IS NULL AND valid_from<=now() AND (valid_to IS NULL OR valid_to>=now()) ORDER BY created_at DESC LIMIT 1;
 IF coalesce(ph->>'name','')='' OR coalesce(ph->>'crm','')='' OR coalesce(ph->>'crm_uf','')='' THEN RAISE EXCEPTION 'Complete nome e CRM do médico'; END IF;
 SELECT coalesce(max(revision),0)+1 INTO rev FROM public.pcmso_clinical_entries WHERE order_id=o.id;
 INSERT INTO public.pcmso_clinical_entries(company_id,order_id,revision,exam_date,notes,procedures,physician,actor_id) VALUES(o.company_id,o.id,rev,_exam_date,trim(_notes),_procedures,ph,auth.uid()) RETURNING id INTO eid;
 INSERT INTO public.pcmso_audit_events(actor_id,company_id,action,entity,entity_id) VALUES(auth.uid(),o.company_id,'clinical.write','pcmso_clinical_entries',eid);
 RETURN eid;
END $$;
CREATE OR REPLACE FUNCTION public.pcmso_pilot_issue_aso(_entry_id uuid,_fitness text,_issued_on date) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.pcmso_clinical_entries; o public.pcmso_exam_orders; v public.pcmso_program_versions; c jsonb; w jsonb; payload jsonb; aid uuid; prev uuid;
BEGIN
 SELECT * INTO e FROM public.pcmso_clinical_entries WHERE id=_entry_id FOR UPDATE;
 IF e.id IS NULL OR NOT public.pcmso_pilot_can(e.company_id,true) OR e.actor_id<>auth.uid() THEN RAISE EXCEPTION 'Emissão exclusiva do médico do atendimento' USING ERRCODE='42501'; END IF;
 IF _fitness IS NULL OR _fitness NOT IN ('apto','inapto') OR _issued_on IS NULL OR _issued_on<e.exam_date OR _issued_on>current_date THEN RAISE EXCEPTION 'Escolha aptidão manualmente e informe data válida'; END IF;
 SELECT id INTO aid FROM public.pcmso_asos WHERE clinical_entry_id=e.id;
 IF aid IS NOT NULL THEN
  IF EXISTS(SELECT 1 FROM public.pcmso_asos WHERE id=aid AND content->>'fitness'=_fitness AND issued_on=_issued_on) THEN RETURN aid; END IF;
  RAISE EXCEPTION 'ASO emitido imutável: corrija o atendimento em nova revisão';
 END IF;
 SELECT * INTO o FROM public.pcmso_exam_orders WHERE id=e.order_id;
 SELECT * INTO v FROM public.pcmso_program_versions WHERE program_id=o.program_id AND company_id=e.company_id;
 IF v.id IS NOT NULL THEN c:=v.content->'company'; ELSE SELECT jsonb_build_object('name',name,'cnpj',cnpj,'address',address) INTO c FROM public.companies WHERE id=e.company_id; END IF;
 SELECT jsonb_build_object('cpf',cpf,'birth_date',birth_date) INTO w FROM public.pcmso_workers WHERE id=o.worker_id AND company_id=e.company_id;
 SELECT id INTO prev FROM public.pcmso_asos WHERE order_id=o.id ORDER BY created_at DESC LIMIT 1;
 payload:=jsonb_build_object('company',c,'worker',o.worker_snapshot||w,'protocol',o.protocol_snapshot,'inventory',coalesce(v.content->'inventory','[]'::jsonb),'responsible_physician',v.physician,'physician',e.physician,'procedures',e.procedures,'fitness',_fitness,'exam_date',e.exam_date,'issued_on',_issued_on,'program_version_id',v.id,'program_pending',v.id IS NULL,'simulation',true,'signature_mode','manual');
 INSERT INTO public.pcmso_asos(company_id,order_id,clinical_entry_id,previous_aso_id,issued_on,content,content_hash,actor_id) VALUES(e.company_id,o.id,e.id,prev,_issued_on,payload,md5(payload::text),auth.uid()) RETURNING id INTO aid;
 INSERT INTO public.pcmso_audit_events(actor_id,company_id,action,entity,entity_id) VALUES(auth.uid(),e.company_id,'aso.issue.simulation','pcmso_asos',aid);
 RETURN aid;
END $$;
CREATE OR REPLACE FUNCTION public.pcmso_pilot_aso_payload(_aso_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.pcmso_asos; sig jsonb;
BEGIN
 SELECT * INTO a FROM public.pcmso_asos WHERE id=_aso_id;
 IF a.id IS NULL OR NOT public.pcmso_pilot_can(a.company_id,true) THEN RAISE EXCEPTION 'Sem autorização médica' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('signed_on',signed_on,'reference',reference,'simulation',true) INTO sig FROM public.pcmso_manual_signature_attestations WHERE aso_id=a.id;
 INSERT INTO public.pcmso_audit_events(actor_id,company_id,action,entity,entity_id) VALUES(auth.uid(),a.company_id,'aso.download.simulation','pcmso_asos',a.id);
 RETURN jsonb_build_object('id',a.id,'content',a.content,'hash',a.content_hash,'signature',sig);
END $$;
CREATE OR REPLACE FUNCTION public.pcmso_pilot_attest_manual_signature(_aso_id uuid,_signed_on date,_reference text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.pcmso_asos; sid uuid;
BEGIN
 SELECT * INTO a FROM public.pcmso_asos WHERE id=_aso_id FOR UPDATE;
 IF a.id IS NULL OR NOT public.pcmso_pilot_can(a.company_id,true) OR a.actor_id<>auth.uid() THEN RAISE EXCEPTION 'Declaração exclusiva do médico emitente' USING ERRCODE='42501'; END IF;
 IF _signed_on IS NULL OR _signed_on<a.issued_on OR _signed_on>current_date OR length(trim(coalesce(_reference,''))) NOT BETWEEN 3 AND 300 THEN RAISE EXCEPTION 'Informe data e referência da assinatura manual simulada'; END IF;
 SELECT id INTO sid FROM public.pcmso_manual_signature_attestations WHERE aso_id=a.id;
 IF sid IS NOT NULL THEN RETURN sid; END IF;
 INSERT INTO public.pcmso_manual_signature_attestations(company_id,aso_id,signed_on,reference,actor_id) VALUES(a.company_id,a.id,_signed_on,trim(_reference),auth.uid()) RETURNING id INTO sid;
 INSERT INTO public.pcmso_audit_events(actor_id,company_id,action,entity,entity_id) VALUES(auth.uid(),a.company_id,'signature.manual.attestation.simulation','pcmso_asos',a.id);
 RETURN sid;
END $$;
CREATE OR REPLACE FUNCTION public.pcmso_pilot_annual_report(_company_id uuid,_year integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE payload jsonb; rid uuid; rev integer; total integer; persons integer; done integer; missing integer;
BEGIN
 IF NOT public.pcmso_pilot_can(_company_id,true) OR NOT public.pcmso_has_clinical_assignment(auth.uid(),_company_id,'responsavel') THEN RAISE EXCEPTION 'Relatório exclusivo do médico responsável' USING ERRCODE='42501'; END IF;
 IF _year IS NULL OR _year NOT BETWEEN 2000 AND extract(year from current_date)::integer THEN RAISE EXCEPTION 'Ano inválido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_company_id::text||_year::text,0));
 SELECT count(*),count(DISTINCT worker_id) INTO total,persons FROM public.pcmso_exam_orders WHERE company_id=_company_id AND extract(year from due_date)=_year AND status<>'cancelado';
 SELECT count(*) INTO done FROM public.pcmso_exam_orders o WHERE o.company_id=_company_id AND extract(year from o.due_date)=_year AND o.status<>'cancelado' AND EXISTS(SELECT 1 FROM public.pcmso_asos a WHERE a.order_id=o.id);
 missing:=total-done;
 IF persons<5 THEN payload:=jsonb_build_object('year',_year,'simulation',true,'status','suprimido','threshold',5,'totals',NULL,'groups','[]'::jsonb,'clinical_indicators',NULL,'clinical_data_status','Não coletado: doenças ocupacionais, CAT e resultados agregados');
 ELSE payload:=jsonb_build_object('year',_year,'simulation',true,'status','incompleto','threshold',5,'totals',jsonb_build_object('requests',total,'with_aso',done,'without_aso',missing),'groups','[]'::jsonb,'clinical_indicators',NULL,'clinical_data_status','Não coletado: doenças ocupacionais, CAT e resultados agregados'); END IF;
 SELECT id INTO rid FROM public.pcmso_annual_reports WHERE company_id=_company_id AND year=_year AND content=payload ORDER BY revision DESC LIMIT 1;
 IF rid IS NOT NULL THEN RETURN rid; END IF;
 SELECT coalesce(max(revision),0)+1 INTO rev FROM public.pcmso_annual_reports WHERE company_id=_company_id AND year=_year;
 INSERT INTO public.pcmso_annual_reports(company_id,year,revision,content,content_hash,actor_id) VALUES(_company_id,_year,rev,payload,md5(payload::text),auth.uid()) RETURNING id INTO rid;
 INSERT INTO public.pcmso_audit_events(actor_id,company_id,action,entity,entity_id) VALUES(auth.uid(),_company_id,'annual.prepare.simulation','pcmso_annual_reports',rid);
 RETURN rid;
END $$;
CREATE OR REPLACE FUNCTION public.pcmso_pilot_prepare_s2220(_aso_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.pcmso_asos; x public.pcmso_esocial_preparations; p jsonb; registration text; eid text;
BEGIN
 SELECT * INTO a FROM public.pcmso_asos WHERE id=_aso_id FOR UPDATE;
 IF a.id IS NULL OR NOT public.pcmso_pilot_can(a.company_id,true) THEN RAISE EXCEPTION 'Sem autorização médica para exportação' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pcmso_manual_signature_attestations WHERE aso_id=a.id) THEN RAISE EXCEPTION 'Registre a assinatura manual simulada antes de preparar o evento'; END IF;
 IF NOT public.pcmso_valid_cpf(a.content->'worker'->>'cpf') OR coalesce(a.content->'worker'->>'registration_number','')='' THEN RAISE EXCEPTION 'CPF ou matrícula incompletos'; END IF;
 registration:=regexp_replace(upper(coalesce(a.content->'company'->>'cnpj','')),'[^A-Z0-9]','','g');
 IF registration !~ '^[A-Z0-9]{12}[0-9]{2}$' THEN RAISE EXCEPTION 'CNPJ incompleto'; END IF;
 p:=a.content||jsonb_build_object('employer_registration',left(registration,8),'environment',2,'signature_pending',true,'transmitted',false);
 SELECT * INTO x FROM public.pcmso_esocial_preparations WHERE aso_id=a.id;
 IF x.id IS NULL THEN
  eid:='ID1'||rpad(left(registration,8),12,'0')||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||lpad((floor(random()*10000000))::text,7,'0');
  INSERT INTO public.pcmso_esocial_preparations(company_id,aso_id,event_id,payload,content_hash,actor_id) VALUES(a.company_id,a.id,eid,p,md5(p::text),auth.uid()) RETURNING * INTO x;
 END IF;
 INSERT INTO public.pcmso_audit_events(actor_id,company_id,action,entity,entity_id) VALUES(auth.uid(),a.company_id,'esocial.prepare.not_transmitted','pcmso_esocial_preparations',x.id);
 RETURN jsonb_build_object('id',x.id,'event_id',x.event_id,'payload',x.payload,'hash',x.content_hash,'status',x.status,'schema_version',x.schema_version);
END $$;
REVOKE ALL ON FUNCTION public.pcmso_pilot_clinical_read(uuid),public.pcmso_pilot_record_encounter(uuid,date,text,jsonb),public.pcmso_pilot_issue_aso(uuid,text,date),public.pcmso_pilot_aso_payload(uuid),public.pcmso_pilot_attest_manual_signature(uuid,date,text),public.pcmso_pilot_annual_report(uuid,integer),public.pcmso_pilot_prepare_s2220(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pcmso_pilot_clinical_read(uuid),public.pcmso_pilot_record_encounter(uuid,date,text,jsonb),public.pcmso_pilot_issue_aso(uuid,text,date),public.pcmso_pilot_aso_payload(uuid),public.pcmso_pilot_attest_manual_signature(uuid,date,text),public.pcmso_pilot_annual_report(uuid,integer),public.pcmso_pilot_prepare_s2220(uuid) TO authenticated;
COMMENT ON TABLE public.pcmso_clinical_entries IS 'Pilot simulation only; append-only clinical revisions. No direct API privileges; audited physician RPC reads.';
COMMENT ON TABLE public.pcmso_asos IS 'Immutable simulated ASO snapshots without clinical notes. Manual attestation is not verified signature or legally issued ASO.';
COMMENT ON TABLE public.pcmso_annual_reports IS 'Pilot incomplete annual summaries. Whole-company threshold 5; no small-group dimensions, outcomes or overlapping totals.';
COMMENT ON TABLE public.pcmso_esocial_preparations IS 'Unsigned S2220 preparation only, environment 2. Not full XSD-valid without XMLDSig; never transmitted.';