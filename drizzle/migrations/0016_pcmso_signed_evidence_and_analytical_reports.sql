CREATE TABLE public.pcmso_evidence_uploads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES public.companies(id),aso_id uuid REFERENCES public.pcmso_asos(id),program_id uuid REFERENCES public.pcmso_programs(id),object_path text NOT NULL UNIQUE,filename text NOT NULL,bytes bigint NOT NULL CHECK(bytes BETWEEN 1 AND 10485760),declared_sha256 text NOT NULL CHECK(declared_sha256 ~ '^[a-f0-9]{64}$'),signed_on date NOT NULL,actor_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),simulation boolean NOT NULL DEFAULT true CHECK(simulation),CHECK((aso_id IS NOT NULL)::int+(program_id IS NOT NULL)::int=1)
);
GRANT ALL ON public.pcmso_evidence_uploads TO service_role;
REVOKE ALL ON public.pcmso_evidence_uploads FROM PUBLIC,anon,authenticated;
ALTER TABLE public.pcmso_evidence_uploads ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.pcmso_evidence_receipts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),upload_id uuid NOT NULL UNIQUE REFERENCES public.pcmso_evidence_uploads(id),actor_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.pcmso_evidence_receipts TO service_role;
REVOKE ALL ON public.pcmso_evidence_receipts FROM PUBLIC,anon,authenticated;
ALTER TABLE public.pcmso_evidence_receipts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER evidence_upload_immutable BEFORE UPDATE OR DELETE ON public.pcmso_evidence_uploads FOR EACH ROW EXECUTE FUNCTION public.pcmso_append_only_guard();
CREATE TRIGGER evidence_receipt_immutable BEFORE UPDATE OR DELETE ON public.pcmso_evidence_receipts FOR EACH ROW EXECUTE FUNCTION public.pcmso_append_only_guard();
CREATE OR REPLACE FUNCTION public.pcmso_evidence_can(_path text,_write boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.pcmso_evidence_uploads e WHERE e.object_path=_path AND public.pcmso_pilot_can(e.company_id,true) AND (NOT _write OR (e.actor_id=auth.uid() AND e.created_at>now()-interval '30 minutes' AND NOT EXISTS(SELECT 1 FROM public.pcmso_evidence_receipts r WHERE r.upload_id=e.id))) AND (_write OR EXISTS(SELECT 1 FROM public.pcmso_evidence_receipts r WHERE r.upload_id=e.id)));
$$;
REVOKE ALL ON FUNCTION public.pcmso_evidence_can(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pcmso_evidence_can(text,boolean) TO authenticated;
CREATE POLICY pcmso_evidence_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='pcmso-signed-evidence' AND public.pcmso_evidence_can(name,true));
CREATE POLICY pcmso_evidence_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='pcmso-signed-evidence' AND public.pcmso_evidence_can(name,false));
CREATE OR REPLACE FUNCTION public.pcmso_evidence_reserve(_aso_id uuid,_program_id uuid,_filename text,_bytes bigint,_sha256 text,_signed_on date) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c uuid; e public.pcmso_evidence_uploads; target_date date; uid uuid:=gen_random_uuid();
BEGIN
 IF (_aso_id IS NOT NULL)::int+(_program_id IS NOT NULL)::int<>1 THEN RAISE EXCEPTION 'Escolha ASO ou programa aprovado'; END IF;
 IF _aso_id IS NOT NULL THEN SELECT company_id,issued_on INTO c,target_date FROM public.pcmso_asos WHERE id=_aso_id AND actor_id=auth.uid();
 ELSE SELECT p.company_id,v.approved_at::date INTO c,target_date FROM public.pcmso_programs p JOIN public.pcmso_program_versions v ON v.program_id=p.id WHERE p.id=_program_id AND public.pcmso_has_clinical_assignment(auth.uid(),p.company_id,'responsavel'); END IF;
 IF c IS NULL OR NOT public.pcmso_pilot_can(c,true) THEN RAISE EXCEPTION 'Sem autorização para guardar documento assinado' USING ERRCODE='42501'; END IF;
 IF _signed_on IS NULL OR _signed_on<target_date OR _signed_on>current_date OR _bytes IS NULL OR _bytes NOT BETWEEN 1 AND 10485760 OR _sha256 IS NULL OR _sha256 !~ '^[a-f0-9]{64}$' OR length(coalesce(_filename,'')) NOT BETWEEN 5 AND 150 OR lower(_filename) NOT LIKE '%.pdf' THEN RAISE EXCEPTION 'Informe PDF até 10 MB e data válida da assinatura'; END IF;
 INSERT INTO public.pcmso_evidence_uploads(id,company_id,aso_id,program_id,object_path,filename,bytes,declared_sha256,signed_on,actor_id) VALUES(uid,c,_aso_id,_program_id,c::text||'/'||uid::text||'.pdf',regexp_replace(_filename,'[^a-zA-Z0-9_. -]','_','g'),_bytes,_sha256,_signed_on,auth.uid()) RETURNING * INTO e;
 INSERT INTO public.pcmso_audit_events(actor_id,company_id,action,entity,entity_id) VALUES(auth.uid(),c,'evidence.reserve.simulation','pcmso_evidence_uploads',e.id);
 RETURN jsonb_build_object('id',e.id,'path',e.object_path);
END $$;
CREATE OR REPLACE FUNCTION public.pcmso_evidence_finalize(_upload_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.pcmso_evidence_uploads; rid uuid; meta jsonb;
BEGIN
 SELECT * INTO e FROM public.pcmso_evidence_uploads WHERE id=_upload_id FOR UPDATE;
 IF e.id IS NULL OR e.actor_id<>auth.uid() OR NOT public.pcmso_pilot_can(e.company_id,true) THEN RAISE EXCEPTION 'Sem autorização' USING ERRCODE='42501'; END IF;
 SELECT id INTO rid FROM public.pcmso_evidence_receipts WHERE upload_id=e.id; IF rid IS NOT NULL THEN RETURN rid; END IF;
 IF e.created_at<now()-interval '30 minutes' THEN RAISE EXCEPTION 'Reserva expirada; inicie novo envio'; END IF;
 SELECT metadata INTO meta FROM storage.objects WHERE bucket_id='pcmso-signed-evidence' AND name=e.object_path;
 IF meta IS NULL OR coalesce(meta->>'mimetype','')<>'application/pdf' OR (meta->>'size')::bigint IS DISTINCT FROM e.bytes THEN RAISE EXCEPTION 'Arquivo PDF ausente ou tamanho incompatível'; END IF;
 INSERT INTO public.pcmso_evidence_receipts(upload_id,actor_id) VALUES(e.id,auth.uid()) RETURNING id INTO rid;
 INSERT INTO public.pcmso_audit_events(actor_id,company_id,action,entity,entity_id) VALUES(auth.uid(),e.company_id,'evidence.stored.simulation','pcmso_evidence_uploads',e.id); RETURN rid;
END $$;
CREATE OR REPLACE FUNCTION public.pcmso_evidence_list(_aso_id uuid DEFAULT NULL,_program_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c uuid; result jsonb;
BEGIN
 IF (_aso_id IS NOT NULL)::int+(_program_id IS NOT NULL)::int<>1 THEN RAISE EXCEPTION 'Escolha documento'; END IF;
 IF _aso_id IS NOT NULL THEN SELECT company_id INTO c FROM public.pcmso_asos WHERE id=_aso_id; ELSE SELECT company_id INTO c FROM public.pcmso_programs WHERE id=_program_id; END IF;
 IF c IS NULL OR NOT public.pcmso_pilot_can(c,true) THEN RAISE EXCEPTION 'Sem autorização médica' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'path',e.object_path,'filename',e.filename,'bytes',e.bytes,'sha256',e.declared_sha256,'signed_on',e.signed_on,'created_at',r.created_at) ORDER BY r.created_at DESC),'[]'::jsonb) INTO result FROM public.pcmso_evidence_uploads e JOIN public.pcmso_evidence_receipts r ON r.upload_id=e.id WHERE e.aso_id=_aso_id OR e.program_id=_program_id;
 INSERT INTO public.pcmso_audit_events(actor_id,company_id,action,entity,entity_id) VALUES(auth.uid(),c,'evidence.read.simulation','pcmso_evidence_uploads',coalesce(_aso_id,_program_id)); RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.pcmso_evidence_reserve(uuid,uuid,text,bigint,text,date),public.pcmso_evidence_finalize(uuid),public.pcmso_evidence_list(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pcmso_evidence_reserve(uuid,uuid,text,bigint,text,date),public.pcmso_evidence_finalize(uuid),public.pcmso_evidence_list(uuid,uuid) TO authenticated;
CREATE TABLE public.pcmso_analytical_reports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),company_id uuid NOT NULL REFERENCES public.companies(id),year integer NOT NULL CHECK(year BETWEEN 2000 AND 2100),revision integer NOT NULL CHECK(revision>0),content jsonb NOT NULL,content_hash text NOT NULL,actor_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),simulation boolean NOT NULL DEFAULT true CHECK(simulation),UNIQUE(company_id,year,revision));
GRANT ALL ON public.pcmso_analytical_reports TO service_role;
REVOKE ALL ON public.pcmso_analytical_reports FROM PUBLIC,anon,authenticated;
ALTER TABLE public.pcmso_analytical_reports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER analytical_immutable BEFORE UPDATE OR DELETE ON public.pcmso_analytical_reports FOR EACH ROW EXECUTE FUNCTION public.pcmso_append_only_guard();
CREATE OR REPLACE FUNCTION public.pcmso_analytical_save(_company_id uuid,_year integer,_content jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE rid uuid; rev int; row jsonb; key text; n numeric; missing boolean:=false; total int:=0; payload jsonb; ph jsonb;
BEGIN
 IF NOT public.pcmso_pilot_can(_company_id,true) OR NOT public.pcmso_has_clinical_assignment(auth.uid(),_company_id,'responsavel') THEN RAISE EXCEPTION 'Exclusivo do médico responsável' USING ERRCODE='42501'; END IF;
 IF _year IS NULL OR _year NOT BETWEEN 2000 AND extract(year from current_date)::int OR jsonb_typeof(_content) IS DISTINCT FROM 'object' OR jsonb_typeof(_content->'groups') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Ano e grupos obrigatórios'; END IF;
 IF jsonb_array_length(_content->'groups') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Informe de 1 a 100 grupos'; END IF;
 IF length(trim(coalesce(_content->>'analysis',''))) NOT BETWEEN 3 AND 20000 OR length(trim(coalesce(_content->>'recommendations',''))) NOT BETWEEN 3 AND 20000 OR length(trim(coalesce(_content->>'sources',''))) NOT BETWEEN 3 AND 5000 OR length(trim(coalesce(_content->>'discussion',''))) NOT BETWEEN 3 AND 10000 THEN RAISE EXCEPTION 'Complete análise, medidas, fontes e discussão com a empresa/CIPA'; END IF;
 FOR row IN SELECT value FROM jsonb_array_elements(_content->'groups') LOOP
  IF length(trim(coalesce(row->>'sector',''))) NOT BETWEEN 1 AND 200 OR length(trim(coalesce(row->>'role',''))) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Informe setor e função'; END IF;
  FOR key IN SELECT unnest(ARRAY['population','clinical_exams','complementary_exams','abnormal_results','occupational_diseases','cat','admission','periodic','return','change_risk','dismissal']) LOOP
   IF NOT row ? key THEN RAISE EXCEPTION 'Indicador ausente: %',key; END IF;
   IF row->key='null'::jsonb THEN missing:=true; ELSE
    IF jsonb_typeof(row->key)<>'number' THEN RAISE EXCEPTION 'Indicador deve ser inteiro ou não informado'; END IF;
    n:=(row->>key)::numeric; IF n<0 OR n>1000000 OR trunc(n)<>n THEN RAISE EXCEPTION 'Contagem inválida'; END IF;
   END IF;
  END LOOP;
  IF row->'population'='null'::jsonb THEN RAISE EXCEPTION 'População do grupo obrigatória'; END IF;
  total:=total+(row->>'population')::int;
  IF row->'abnormal_results'<>'null'::jsonb AND row->'complementary_exams'<>'null'::jsonb AND (row->>'abnormal_results')::int>(row->>'complementary_exams')::int THEN RAISE EXCEPTION 'Alterações excedem exames complementares'; END IF;
  IF row->'occupational_diseases'<>'null'::jsonb AND (row->>'occupational_diseases')::int>(row->>'population')::int THEN RAISE EXCEPTION 'Casos excedem população'; END IF;
  IF row->'clinical_exams'<>'null'::jsonb AND row->'admission'<>'null'::jsonb AND row->'periodic'<>'null'::jsonb AND row->'return'<>'null'::jsonb AND row->'change_risk'<>'null'::jsonb AND row->'dismissal'<>'null'::jsonb AND (row->>'clinical_exams')::int<>(row->>'admission')::int+(row->>'periodic')::int+(row->>'return')::int+(row->>'change_risk')::int+(row->>'dismissal')::int THEN RAISE EXCEPTION 'Tipos de exame não reconciliam com exames clínicos'; END IF;
 END LOOP;
 SELECT jsonb_build_object('name',professional_name,'crm',crm,'crm_uf',crm_uf) INTO ph FROM public.pcmso_professional_assignments WHERE user_id=auth.uid() AND company_id=_company_id AND clinical_role='responsavel' AND revoked_at IS NULL AND valid_from<=now() AND (valid_to IS NULL OR valid_to>=now()) ORDER BY created_at DESC LIMIT 1;
 payload:=jsonb_build_object('year',_year,'period_start',make_date(_year,1,1),'period_end',make_date(_year,12,31),'simulation',true,'status',CASE WHEN missing THEN 'incompleto' ELSE 'preenchido_simulado' END,'threshold',5,'company',(SELECT jsonb_build_object('name',name,'cnpj',cnpj,'address',address) FROM public.companies WHERE id=_company_id),'physician',ph,'groups',_content->'groups','analysis',_content->>'analysis','recommendations',_content->>'recommendations','sources',_content->>'sources','discussion',_content->>'discussion','population_definition','Trabalhadores únicos por grupo setor/função, sem sobreposição; contagens declaradas e revisadas pelo médico. Não inferidas de ASO.');
 PERFORM pg_advisory_xact_lock(hashtextextended(_company_id::text||_year::text||'analytical',0));
 SELECT id INTO rid FROM public.pcmso_analytical_reports WHERE company_id=_company_id AND year=_year AND content=payload ORDER BY revision DESC LIMIT 1; IF rid IS NOT NULL THEN RETURN rid; END IF;
 SELECT coalesce(max(revision),0)+1 INTO rev FROM public.pcmso_analytical_reports WHERE company_id=_company_id AND year=_year;
 INSERT INTO public.pcmso_analytical_reports(company_id,year,revision,content,content_hash,actor_id) VALUES(_company_id,_year,rev,payload,public.legal_checksum(payload),auth.uid()) RETURNING id INTO rid;
 INSERT INTO public.pcmso_audit_events(actor_id,company_id,action,entity,entity_id) VALUES(auth.uid(),_company_id,'analytical.save.simulation','pcmso_analytical_reports',rid);RETURN rid;
END $$;
CREATE OR REPLACE FUNCTION public.pcmso_analytical_list(_company_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.pcmso_pilot_can(_company_id,true) OR NOT public.pcmso_has_clinical_assignment(auth.uid(),_company_id,'responsavel') THEN RAISE EXCEPTION 'Exclusivo do médico responsável' USING ERRCODE='42501'; END IF;
 INSERT INTO public.pcmso_audit_events(actor_id,company_id,action,entity) VALUES(auth.uid(),_company_id,'analytical.read.simulation','pcmso_analytical_reports');
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY year DESC,revision DESC) FROM public.pcmso_analytical_reports r WHERE company_id=_company_id),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.pcmso_analytical_save(uuid,integer,jsonb),public.pcmso_analytical_list(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pcmso_analytical_save(uuid,integer,jsonb),public.pcmso_analytical_list(uuid) TO authenticated;
COMMENT ON TABLE public.pcmso_evidence_uploads IS 'Immutable PDF custody tickets; declared client SHA256 checked on download, not proof of manual signature. Pilot simulation only. No delete/update storage policies.';
COMMENT ON TABLE public.pcmso_analytical_reports IS 'Physician-only immutable manually declared analytical simulation snapshots. No direct clinical API access; PDF suppression must not be used as authorization.';