ALTER TABLE public.pcmso_programs ADD COLUMN previous_program_id uuid REFERENCES public.pcmso_programs(id), ADD COLUMN revision_number integer NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX pcmso_one_next_revision ON public.pcmso_programs(previous_program_id) WHERE previous_program_id IS NOT NULL;
CREATE TABLE public.pcmso_exam_catalog (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), name text NOT NULL CHECK(length(trim(name)) BETWEEN 2 AND 200), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(company_id,name)
);
GRANT SELECT,INSERT ON public.pcmso_exam_catalog TO authenticated;
GRANT ALL ON public.pcmso_exam_catalog TO service_role;
ALTER TABLE public.pcmso_exam_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY exam_catalog_read ON public.pcmso_exam_catalog FOR SELECT TO authenticated USING(public.pcmso_can(company_id,'program.view'));
CREATE POLICY exam_catalog_insert ON public.pcmso_exam_catalog FOR INSERT TO authenticated WITH CHECK(public.pcmso_can(company_id,'program.prepare'));
CREATE TABLE public.pcmso_protocols (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), program_id uuid NOT NULL REFERENCES public.pcmso_programs(id), exam_id uuid NOT NULL REFERENCES public.pcmso_exam_catalog(id), exam_name text NOT NULL,
 exam_type text NOT NULL CHECK(exam_type IN ('admissional','periodico','retorno','mudanca_risco','demissional')),
 periodicity_months integer CHECK(periodicity_months BETWEEN 1 AND 120), scope text NOT NULL CHECK(scope IN ('todos','ghe')),
 snapshot_id uuid REFERENCES public.pcmso_source_snapshots(id), ghe_id uuid, risk_id uuid, source_hash text,
 justification text NOT NULL CHECK(length(trim(justification)) BETWEEN 3 AND 10000), notes text NOT NULL DEFAULT '' CHECK(length(notes)<=10000), active boolean NOT NULL DEFAULT true,
 created_by uuid, updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(exam_type<>'periodico' OR periodicity_months IS NOT NULL), CHECK((scope='todos' AND ghe_id IS NULL AND snapshot_id IS NULL AND risk_id IS NULL) OR (scope='ghe' AND ghe_id IS NOT NULL AND snapshot_id IS NOT NULL))
);
GRANT SELECT,INSERT,UPDATE ON public.pcmso_protocols TO authenticated;
GRANT ALL ON public.pcmso_protocols TO service_role;
ALTER TABLE public.pcmso_protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY protocol_read ON public.pcmso_protocols FOR SELECT TO authenticated USING(public.pcmso_can(company_id,'program.view'));
CREATE POLICY protocol_insert ON public.pcmso_protocols FOR INSERT TO authenticated WITH CHECK(public.pcmso_can(company_id,'program.prepare'));
CREATE POLICY protocol_update ON public.pcmso_protocols FOR UPDATE TO authenticated USING(public.pcmso_can(company_id,'program.prepare')) WITH CHECK(public.pcmso_can(company_id,'program.prepare'));
CREATE INDEX ON public.pcmso_protocols(program_id);
CREATE TABLE public.pcmso_protocol_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), program_id uuid NOT NULL REFERENCES public.pcmso_programs(id), protocol_id uuid NOT NULL REFERENCES public.pcmso_protocols(id), content jsonb NOT NULL, actor_id uuid, recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pcmso_protocol_history TO authenticated;
GRANT ALL ON public.pcmso_protocol_history TO service_role;
ALTER TABLE public.pcmso_protocol_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY protocol_history_read ON public.pcmso_protocol_history FOR SELECT TO authenticated USING(public.pcmso_can(company_id,'program.view'));
CREATE TABLE public.pcmso_program_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), program_id uuid NOT NULL UNIQUE REFERENCES public.pcmso_programs(id), revision_number integer NOT NULL, content jsonb NOT NULL, content_hash text NOT NULL, approved_by uuid NOT NULL, approved_at timestamptz NOT NULL DEFAULT now(), physician jsonb NOT NULL
);
GRANT SELECT ON public.pcmso_program_versions TO authenticated;
GRANT ALL ON public.pcmso_program_versions TO service_role;
ALTER TABLE public.pcmso_program_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY program_version_read ON public.pcmso_program_versions FOR SELECT TO authenticated USING(public.pcmso_can(company_id,'program.view'));
CREATE OR REPLACE FUNCTION public.pcmso_protocol_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.pcmso_programs; s public.pcmso_source_snapshots; e public.pcmso_exam_catalog;
BEGIN
 SELECT * INTO p FROM public.pcmso_programs WHERE id=NEW.program_id FOR UPDATE;
 IF p.id IS NULL OR p.company_id<>NEW.company_id OR NOT public.pcmso_can(NEW.company_id,'program.prepare') THEN RAISE EXCEPTION 'Sem autorização para este programa' USING ERRCODE='42501'; END IF;
 IF p.status<>'rascunho' THEN RAISE EXCEPTION 'Protocolos só podem ser alterados em rascunho'; END IF;
 IF TG_OP='UPDATE' AND (NEW.company_id<>OLD.company_id OR NEW.program_id<>OLD.program_id OR NEW.id<>OLD.id) THEN RAISE EXCEPTION 'Vínculo do protocolo imutável'; END IF;
 SELECT * INTO e FROM public.pcmso_exam_catalog WHERE id=NEW.exam_id;
 IF e.id IS NULL OR e.company_id<>NEW.company_id THEN RAISE EXCEPTION 'Exame de outra empresa'; END IF;
 NEW.exam_name:=e.name;
 IF NEW.scope='ghe' THEN
  SELECT * INTO s FROM public.pcmso_source_snapshots WHERE id=NEW.snapshot_id;
  IF s.id IS NULL OR s.company_id<>NEW.company_id OR s.program_id<>NEW.program_id THEN RAISE EXCEPTION 'Origem de outro programa ou empresa'; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s.content->'ghes') g WHERE g->>'id'=NEW.ghe_id::text) THEN RAISE EXCEPTION 'GHE ausente na cópia do inventário'; END IF;
  IF NEW.risk_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s.content->'risks') r WHERE r->>'id'=NEW.risk_id::text AND r->>'ghe_id'=NEW.ghe_id::text) THEN RAISE EXCEPTION 'Risco incompatível com o GHE'; END IF;
  NEW.source_hash:=s.source_hash;
 ELSE NEW.source_hash:=NULL;
 END IF;
 IF NEW.exam_type<>'periodico' THEN NEW.periodicity_months:=NULL; END IF;
 IF TG_OP='INSERT' THEN NEW.created_by:=auth.uid(); ELSE NEW.created_by:=OLD.created_by; NEW.created_at:=OLD.created_at; END IF;
 NEW.updated_by:=auth.uid(); NEW.updated_at:=now(); RETURN NEW;
END; $$;
CREATE TRIGGER protocol_guard BEFORE INSERT OR UPDATE ON public.pcmso_protocols FOR EACH ROW EXECUTE FUNCTION public.pcmso_protocol_guard();
CREATE OR REPLACE FUNCTION public.pcmso_protocol_record() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.pcmso_protocol_history(company_id,program_id,protocol_id,content,actor_id) VALUES(NEW.company_id,NEW.program_id,NEW.id,to_jsonb(NEW),auth.uid()); RETURN NEW;
END; $$;
CREATE TRIGGER protocol_history AFTER INSERT OR UPDATE ON public.pcmso_protocols FOR EACH ROW EXECUTE FUNCTION public.pcmso_protocol_record();
CREATE TRIGGER protocol_audit AFTER INSERT OR UPDATE ON public.pcmso_protocols FOR EACH ROW EXECUTE FUNCTION public.pcmso_audit_trigger();
CREATE OR REPLACE FUNCTION public.pcmso_programs_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prev public.pcmso_programs;
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.created_by:=auth.uid();
  IF NEW.status<>'rascunho' THEN RAISE EXCEPTION 'Programa novo deve iniciar como rascunho'; END IF;
  IF NEW.previous_program_id IS NOT NULL THEN
   SELECT * INTO prev FROM public.pcmso_programs WHERE id=NEW.previous_program_id FOR UPDATE;
   IF prev.id IS NULL OR prev.company_id<>NEW.company_id OR prev.status<>'aprovado' OR NOT public.pcmso_can(NEW.company_id,'program.prepare') THEN RAISE EXCEPTION 'Revisão exige programa aprovado da mesma empresa'; END IF;
   NEW.revision_number:=prev.revision_number+1;
  ELSE NEW.revision_number:=1;
  END IF;
 ELSE
  IF NEW.company_id<>OLD.company_id OR NEW.id<>OLD.id OR NEW.previous_program_id IS DISTINCT FROM OLD.previous_program_id OR NEW.revision_number<>OLD.revision_number THEN RAISE EXCEPTION 'Identidade do programa imutável'; END IF;
  IF OLD.status IN ('aprovado','arquivado') THEN RAISE EXCEPTION 'Programa aprovado ou arquivado não pode ser editado; crie uma revisão'; END IF;
  IF NEW.status='aprovado' THEN
   IF OLD.status<>'em_revisao' OR NOT public.pcmso_can(NEW.company_id,'program.approve') THEN RAISE EXCEPTION 'Aprovação exige revisão e médico responsável atribuído'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.pcmso_protocols WHERE program_id=NEW.id AND active) THEN RAISE EXCEPTION 'Cadastre ao menos um protocolo de exame para revisão médica'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.pcmso_source_snapshots WHERE program_id=NEW.id) THEN RAISE EXCEPTION 'Inventário do programa não foi importado'; END IF;
   IF EXISTS(SELECT 1 FROM public.pcmso_source_snapshots s LEFT JOIN public.pcmso_inventory_reviews r ON r.snapshot_id=s.id WHERE s.program_id=NEW.id AND (r.id IS NULL OR r.reviewed_at<s.captured_at)) THEN RAISE EXCEPTION 'Registre a revisão do inventário atualizado antes de aprovar'; END IF;
   IF EXISTS(SELECT 1 FROM public.pcmso_change_requests WHERE program_id=NEW.id AND resolved_at IS NULL) THEN RAISE EXCEPTION 'Há alterações pendentes nas fontes'; END IF;
   IF EXISTS(SELECT 1 FROM public.pcmso_protocols t JOIN public.pcmso_source_snapshots s ON s.id=t.snapshot_id WHERE t.program_id=NEW.id AND t.active AND t.source_hash IS DISTINCT FROM s.source_hash) THEN RAISE EXCEPTION 'Revise os protocolos vinculados ao inventário atualizado'; END IF;
  END IF;
  NEW.created_by:=OLD.created_by; NEW.created_at:=OLD.created_at; NEW.updated_at:=now(); NEW.updated_by:=auth.uid();
 END IF; RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.pcmso_capture_approved_version() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE payload jsonb; physician_data jsonb;
BEGIN
 IF NEW.status='aprovado' AND OLD.status<>'aprovado' THEN
  SELECT jsonb_build_object('name',professional_name,'crm',crm,'crm_uf',crm_uf,'assignment_id',id) INTO physician_data FROM public.pcmso_professional_assignments WHERE user_id=auth.uid() AND company_id=NEW.company_id AND clinical_role='responsavel' AND revoked_at IS NULL AND valid_from<=now() AND (valid_to IS NULL OR valid_to>=now()) ORDER BY created_at DESC LIMIT 1;
  IF physician_data IS NULL OR coalesce(physician_data->>'crm','')='' OR coalesce(physician_data->>'crm_uf','')='' OR coalesce(physician_data->>'name','')='' THEN RAISE EXCEPTION 'Complete nome e CRM/UF do médico responsável'; END IF;
  payload:=jsonb_build_object('program',to_jsonb(NEW),'company',(SELECT to_jsonb(c) FROM public.companies c WHERE id=NEW.company_id),'inventory',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM public.pcmso_source_snapshots s WHERE program_id=NEW.id),'[]'::jsonb),'inventory_reviews',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.pcmso_inventory_reviews r JOIN public.pcmso_source_snapshots s ON s.id=r.snapshot_id WHERE s.program_id=NEW.id),'[]'::jsonb),'protocols',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.pcmso_protocols t WHERE program_id=NEW.id AND active),'[]'::jsonb));
  INSERT INTO public.pcmso_program_versions(company_id,program_id,revision_number,content,content_hash,approved_by,physician) VALUES(NEW.company_id,NEW.id,NEW.revision_number,payload,md5(payload::text),auth.uid(),physician_data);
 END IF; RETURN NEW;
END; $$;
CREATE TRIGGER program_capture_version AFTER UPDATE ON public.pcmso_programs FOR EACH ROW EXECUTE FUNCTION public.pcmso_capture_approved_version();
COMMENT ON TABLE public.pcmso_program_versions IS 'Immutable approval evidence, not a digital signature; no authenticated write grants.';
COMMENT ON TABLE public.pcmso_protocols IS 'Manual exam protocols requiring physician program approval; never prescribed from score or AI.';