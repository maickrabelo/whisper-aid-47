CREATE TABLE public.pcmso_document_settings (
 program_id uuid PRIMARY KEY REFERENCES public.pcmso_programs(id), company_id uuid NOT NULL REFERENCES public.companies(id), valid_from date, valid_to date, objectives text NOT NULL DEFAULT '', responsibilities text NOT NULL DEFAULT '', emergency_flow text NOT NULL DEFAULT '', monitoring text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now(), CHECK(valid_to IS NULL OR valid_from IS NULL OR valid_to>=valid_from), CHECK(length(objectives)<=20000 AND length(responsibilities)<=20000 AND length(emergency_flow)<=20000 AND length(monitoring)<=20000)
);
GRANT SELECT,INSERT,UPDATE ON public.pcmso_document_settings TO authenticated;
GRANT ALL ON public.pcmso_document_settings TO service_role;
ALTER TABLE public.pcmso_document_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_read ON public.pcmso_document_settings FOR SELECT TO authenticated USING(public.pcmso_can(company_id,'program.view'));
CREATE POLICY settings_insert ON public.pcmso_document_settings FOR INSERT TO authenticated WITH CHECK(public.pcmso_can(company_id,'program.prepare'));
CREATE POLICY settings_update ON public.pcmso_document_settings FOR UPDATE TO authenticated USING(public.pcmso_can(company_id,'program.prepare')) WITH CHECK(public.pcmso_can(company_id,'program.prepare'));
REVOKE DELETE ON public.pcmso_document_settings FROM authenticated,anon;
CREATE TABLE public.pcmso_actions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), program_id uuid NOT NULL REFERENCES public.pcmso_programs(id), company_id uuid NOT NULL REFERENCES public.companies(id), title text NOT NULL CHECK(length(trim(title)) BETWEEN 3 AND 300), responsible text NOT NULL DEFAULT '' CHECK(length(responsible)<=300), due_date date, status text NOT NULL DEFAULT 'planejada' CHECK(status IN ('planejada','em_andamento','concluida','cancelada')), notes text NOT NULL DEFAULT '' CHECK(length(notes)<=10000), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON public.pcmso_actions TO authenticated;
GRANT ALL ON public.pcmso_actions TO service_role;
ALTER TABLE public.pcmso_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY actions_read ON public.pcmso_actions FOR SELECT TO authenticated USING(public.pcmso_can(company_id,'program.view'));
CREATE POLICY actions_insert ON public.pcmso_actions FOR INSERT TO authenticated WITH CHECK(public.pcmso_can(company_id,'program.prepare'));
CREATE POLICY actions_update ON public.pcmso_actions FOR UPDATE TO authenticated USING(public.pcmso_can(company_id,'program.prepare')) WITH CHECK(public.pcmso_can(company_id,'program.prepare'));
REVOKE DELETE ON public.pcmso_actions FROM authenticated,anon;
CREATE TABLE public.pcmso_action_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), action_id uuid NOT NULL REFERENCES public.pcmso_actions(id), content jsonb NOT NULL, actor_id uuid, recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pcmso_action_history TO authenticated;
GRANT ALL ON public.pcmso_action_history TO service_role;
ALTER TABLE public.pcmso_action_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY action_history_read ON public.pcmso_action_history FOR SELECT TO authenticated USING(public.pcmso_can(company_id,'program.view'));
REVOKE INSERT,UPDATE,DELETE ON public.pcmso_action_history FROM authenticated,anon;
CREATE OR REPLACE FUNCTION public.pcmso_document_draft_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.pcmso_programs;
BEGIN
 SELECT * INTO p FROM public.pcmso_programs WHERE id=NEW.program_id FOR UPDATE;
 IF p.id IS NULL OR p.company_id<>NEW.company_id OR NOT public.pcmso_can(NEW.company_id,'program.prepare') THEN RAISE EXCEPTION 'Sem autorização para este programa' USING ERRCODE='42501'; END IF;
 IF p.status<>'rascunho' THEN RAISE EXCEPTION 'Documento e ações só podem ser alterados em rascunho'; END IF;
 IF TG_OP='UPDATE' AND (NEW.company_id<>OLD.company_id OR NEW.program_id<>OLD.program_id) THEN RAISE EXCEPTION 'Vínculos imutáveis'; END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER settings_guard BEFORE INSERT OR UPDATE ON public.pcmso_document_settings FOR EACH ROW EXECUTE FUNCTION public.pcmso_document_draft_guard();
CREATE TRIGGER actions_guard BEFORE INSERT OR UPDATE ON public.pcmso_actions FOR EACH ROW EXECUTE FUNCTION public.pcmso_document_draft_guard();
CREATE TRIGGER actions_audit AFTER INSERT OR UPDATE ON public.pcmso_actions FOR EACH ROW EXECUTE FUNCTION public.pcmso_audit_trigger();
CREATE OR REPLACE FUNCTION public.pcmso_action_record() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.pcmso_action_history(company_id,action_id,content,actor_id) VALUES(NEW.company_id,NEW.id,to_jsonb(NEW),auth.uid()); RETURN NEW; END $$;
CREATE TRIGGER actions_record AFTER INSERT OR UPDATE ON public.pcmso_actions FOR EACH ROW EXECUTE FUNCTION public.pcmso_action_record();
CREATE OR REPLACE FUNCTION public.pcmso_phase5_capture() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.previous_program_id IS NOT NULL THEN
   INSERT INTO public.pcmso_document_settings(program_id,company_id,valid_from,valid_to,objectives,responsibilities,emergency_flow,monitoring) SELECT NEW.id,NEW.company_id,valid_from,valid_to,objectives,responsibilities,emergency_flow,monitoring FROM public.pcmso_document_settings WHERE program_id=NEW.previous_program_id;
   INSERT INTO public.pcmso_actions(program_id,company_id,title,responsible,due_date,status,notes) SELECT NEW.id,NEW.company_id,title,responsible,due_date,'planejada',notes FROM public.pcmso_actions WHERE program_id=NEW.previous_program_id AND status<>'cancelada';
  END IF;
 ELSIF NEW.status='aprovado' AND OLD.status<>'aprovado' THEN
  UPDATE public.pcmso_program_versions SET content=content||jsonb_build_object('document_settings',(SELECT to_jsonb(s) FROM public.pcmso_document_settings s WHERE program_id=NEW.id),'actions',coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.pcmso_actions a WHERE program_id=NEW.id),'[]'::jsonb)) WHERE program_id=NEW.id;
  UPDATE public.pcmso_program_versions SET content_hash=md5(content::text) WHERE program_id=NEW.id;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER zz_phase5_capture AFTER INSERT OR UPDATE ON public.pcmso_programs FOR EACH ROW EXECUTE FUNCTION public.pcmso_phase5_capture();
CREATE OR REPLACE FUNCTION public.pcmso_document_payload(_program_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.pcmso_programs; v public.pcmso_program_versions; payload jsonb;
BEGIN
 SELECT * INTO p FROM public.pcmso_programs WHERE id=_program_id;
 IF p.id IS NULL OR NOT public.pcmso_can(p.company_id,'program.view') THEN RAISE EXCEPTION 'Sem autorização' USING ERRCODE='42501'; END IF;
 SELECT * INTO v FROM public.pcmso_program_versions WHERE program_id=p.id;
 IF v.id IS NOT NULL THEN RETURN jsonb_build_object('kind','aprovado','content',v.content,'hash',v.content_hash,'physician',v.physician,'approved_at',v.approved_at); END IF;
 IF p.status='arquivado' THEN RAISE EXCEPTION 'Programa arquivado sem versão aprovada'; END IF;
 payload:=jsonb_build_object('program',to_jsonb(p),'company',(SELECT to_jsonb(c) FROM public.companies c WHERE id=p.company_id),'inventory',coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM public.pcmso_source_snapshots s WHERE program_id=p.id),'[]'::jsonb),'protocols',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM public.pcmso_protocols t WHERE program_id=p.id AND active),'[]'::jsonb),'document_settings',(SELECT to_jsonb(s) FROM public.pcmso_document_settings s WHERE program_id=p.id),'actions',coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM public.pcmso_actions a WHERE program_id=p.id),'[]'::jsonb));
 RETURN jsonb_build_object('kind','minuta','content',payload,'hash',md5(payload::text));
END $$;
REVOKE ALL ON FUNCTION public.pcmso_document_payload(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pcmso_document_payload(uuid) TO authenticated,service_role;
COMMENT ON FUNCTION public.pcmso_document_payload(uuid) IS 'Authorized documentary export. Approval is not digital signing. Approved content never uses live joins.';
COMMENT ON TABLE public.pcmso_actions IS 'Non-clinical preventive actions; no worker results or diagnosis. Definitions frozen on approval; changes require a revision.';