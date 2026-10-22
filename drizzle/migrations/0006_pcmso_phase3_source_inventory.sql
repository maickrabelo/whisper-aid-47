CREATE TABLE public.pcmso_source_snapshots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), program_id uuid NOT NULL REFERENCES public.pcmso_programs(id), pgr_document_id uuid NOT NULL, content jsonb NOT NULL, source_hash text NOT NULL, captured_at timestamptz NOT NULL DEFAULT now(), created_by uuid, UNIQUE(program_id,pgr_document_id)
);
GRANT SELECT,INSERT,UPDATE ON public.pcmso_source_snapshots TO authenticated;
GRANT ALL ON public.pcmso_source_snapshots TO service_role;
ALTER TABLE public.pcmso_source_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY snapshot_read ON public.pcmso_source_snapshots FOR SELECT TO authenticated USING (public.pcmso_can(company_id,'program.view'));
CREATE POLICY snapshot_insert ON public.pcmso_source_snapshots FOR INSERT TO authenticated WITH CHECK (public.pcmso_can(company_id,'program.prepare'));
CREATE POLICY snapshot_update ON public.pcmso_source_snapshots FOR UPDATE TO authenticated USING (public.pcmso_can(company_id,'program.prepare')) WITH CHECK (public.pcmso_can(company_id,'program.prepare'));
CREATE TABLE public.pcmso_change_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), program_id uuid NOT NULL REFERENCES public.pcmso_programs(id), pgr_document_id uuid NOT NULL, current_hash text NOT NULL, detected_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz, UNIQUE(program_id,pgr_document_id)
);
GRANT SELECT ON public.pcmso_change_requests TO authenticated;
GRANT ALL ON public.pcmso_change_requests TO service_role;
ALTER TABLE public.pcmso_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY changes_read ON public.pcmso_change_requests FOR SELECT TO authenticated USING (public.pcmso_can(company_id,'program.view'));
CREATE OR REPLACE FUNCTION public.pcmso_source_payload(_pgr_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object(
 'document',to_jsonb(d)-'created_at'-'updated_at',
 'ghes',coalesce((SELECT jsonb_agg(to_jsonb(g)-'created_at'-'updated_at' ORDER BY g.id) FROM public.pgr_ghe g WHERE g.pgr_document_id=d.id),'[]'::jsonb),
 'risks',coalesce((SELECT jsonb_agg(to_jsonb(r)-'created_at'-'updated_at' ORDER BY r.id) FROM public.pgr_risks r WHERE r.pgr_document_id=d.id),'[]'::jsonb),
 'aeps',coalesce((SELECT jsonb_agg(jsonb_build_object('assessment',to_jsonb(a)-'created_at'-'updated_at','factors',coalesce((SELECT jsonb_agg(to_jsonb(f)-'created_at'-'updated_at' ORDER BY f.id) FROM public.aep_fatores_avaliados f WHERE f.aep_id=a.id),'[]'::jsonb)) ORDER BY a.id) FROM public.aep_avaliacoes a WHERE a.company_id=d.company_id AND (a.pgr_document_id=d.id OR EXISTS(SELECT 1 FROM public.pgr_ghe g WHERE g.id=a.ghe_id AND g.pgr_document_id=d.id) OR (a.pgr_document_id IS NULL AND a.ghe_id IS NULL))),'[]'::jsonb),
 'links',coalesce((SELECT jsonb_agg(jsonb_build_object('aep_fator_id',v.aep_fator_id,'pgr_risk_id',v.pgr_risk_id) ORDER BY v.aep_fator_id,v.pgr_risk_id) FROM public.aep_pgr_vinculo v JOIN public.pgr_risks r ON r.id=v.pgr_risk_id JOIN public.aep_fatores_avaliados f ON f.id=v.aep_fator_id JOIN public.aep_avaliacoes a ON a.id=f.aep_id WHERE r.pgr_document_id=d.id AND a.company_id=d.company_id),'[]'::jsonb)
 ) FROM public.pgr_documents d WHERE d.id=_pgr_id;
$$;
REVOKE ALL ON FUNCTION public.pcmso_source_payload(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.pcmso_snapshot_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.pcmso_programs; doc_company uuid; payload jsonb;
BEGIN
 SELECT * INTO p FROM public.pcmso_programs WHERE id=NEW.program_id FOR UPDATE;
 IF p.id IS NULL OR p.company_id<>NEW.company_id THEN RAISE EXCEPTION 'Empresa do programa inválida'; END IF;
 IF p.status NOT IN ('rascunho','em_revisao') THEN RAISE EXCEPTION 'Programa aprovado ou arquivado não aceita alterações'; END IF;
 IF NOT public.pcmso_can(NEW.company_id,'program.prepare') THEN RAISE EXCEPTION 'Sem autorização' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' AND (NEW.program_id<>OLD.program_id OR NEW.company_id<>OLD.company_id OR NEW.pgr_document_id<>OLD.pgr_document_id) THEN RAISE EXCEPTION 'Vínculo da origem não pode mudar'; END IF;
 SELECT company_id INTO doc_company FROM public.pgr_documents WHERE id=NEW.pgr_document_id;
 IF doc_company IS DISTINCT FROM NEW.company_id THEN RAISE EXCEPTION 'PGR de outra empresa ou inexistente'; END IF;
 IF EXISTS(SELECT 1 FROM public.pgr_risks r LEFT JOIN public.pgr_ghe g ON g.id=r.ghe_id WHERE r.pgr_document_id=NEW.pgr_document_id AND r.ghe_id IS NOT NULL AND g.pgr_document_id IS DISTINCT FROM r.pgr_document_id) THEN RAISE EXCEPTION 'GHE incompatível com o PGR'; END IF;
 payload:=public.pcmso_source_payload(NEW.pgr_document_id);
 NEW.content:=payload; NEW.source_hash:=md5(payload::text); NEW.captured_at:=now(); NEW.created_by:=auth.uid();
 RETURN NEW;
END; $$;
CREATE TRIGGER snapshot_guard BEFORE INSERT OR UPDATE ON public.pcmso_source_snapshots FOR EACH ROW EXECUTE FUNCTION public.pcmso_snapshot_guard();
CREATE TRIGGER snapshot_audit AFTER INSERT OR UPDATE ON public.pcmso_source_snapshots FOR EACH ROW EXECUTE FUNCTION public.pcmso_audit_trigger();
CREATE OR REPLACE FUNCTION public.pcmso_import_inventory(_program_id uuid,_pgr_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.pcmso_programs; payload jsonb; s public.pcmso_source_snapshots;
BEGIN
 SELECT * INTO p FROM public.pcmso_programs WHERE id=_program_id FOR UPDATE;
 IF p.id IS NULL OR NOT public.pcmso_can(p.company_id,'program.prepare') THEN RAISE EXCEPTION 'Sem autorização' USING ERRCODE='42501'; END IF;
 IF p.status NOT IN ('rascunho','em_revisao') THEN RAISE EXCEPTION 'Programa aprovado ou arquivado não aceita importação'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pgr_documents WHERE id=_pgr_id AND company_id=p.company_id) THEN RAISE EXCEPTION 'PGR de outra empresa ou inexistente'; END IF;
 payload:=public.pcmso_source_payload(_pgr_id);
 INSERT INTO public.pcmso_source_snapshots(company_id,program_id,pgr_document_id,content,source_hash) VALUES(p.company_id,p.id,_pgr_id,payload,md5(payload::text))
 ON CONFLICT(program_id,pgr_document_id) DO UPDATE SET content=excluded.content WHERE pcmso_source_snapshots.source_hash IS DISTINCT FROM excluded.source_hash;
 UPDATE public.pcmso_change_requests SET resolved_at=now() WHERE program_id=p.id AND pgr_document_id=_pgr_id AND resolved_at IS NULL;
 SELECT * INTO s FROM public.pcmso_source_snapshots WHERE program_id=p.id AND pgr_document_id=_pgr_id;
 RETURN jsonb_build_object('id',s.id,'risks',jsonb_array_length(s.content->'risks'),'aeps',jsonb_array_length(s.content->'aeps'));
END; $$;
REVOKE ALL ON FUNCTION public.pcmso_import_inventory(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pcmso_import_inventory(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.pcmso_detect_source_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.pcmso_source_snapshots; h text; cid uuid; did uuid; rowdata jsonb;
BEGIN
 IF TG_OP='DELETE' THEN rowdata:=to_jsonb(OLD); ELSE rowdata:=to_jsonb(NEW); END IF;
 IF TG_TABLE_NAME='pgr_documents' THEN did:=(rowdata->>'id')::uuid;
 ELSIF TG_TABLE_NAME IN ('pgr_risks','pgr_ghe') THEN did:=(rowdata->>'pgr_document_id')::uuid;
 ELSIF TG_TABLE_NAME='aep_avaliacoes' THEN cid:=(rowdata->>'company_id')::uuid;
 ELSIF TG_TABLE_NAME='aep_fatores_avaliados' THEN SELECT company_id INTO cid FROM public.aep_avaliacoes WHERE id=(rowdata->>'aep_id')::uuid;
 ELSE SELECT d.company_id INTO cid FROM public.pgr_risks r JOIN public.pgr_documents d ON d.id=r.pgr_document_id WHERE r.id=(rowdata->>'pgr_risk_id')::uuid;
 END IF;
 FOR s IN SELECT * FROM public.pcmso_source_snapshots WHERE pgr_document_id=did OR company_id=cid LOOP
 h:=md5(coalesce(public.pcmso_source_payload(s.pgr_document_id),'null'::jsonb)::text);
 IF h IS DISTINCT FROM s.source_hash THEN
 INSERT INTO public.pcmso_change_requests(company_id,program_id,pgr_document_id,current_hash) VALUES(s.company_id,s.program_id,s.pgr_document_id,h)
 ON CONFLICT(program_id,pgr_document_id) DO UPDATE SET current_hash=excluded.current_hash,detected_at=now(),resolved_at=NULL;
 ELSE UPDATE public.pcmso_change_requests SET resolved_at=now() WHERE program_id=s.program_id AND pgr_document_id=s.pgr_document_id AND resolved_at IS NULL;
 END IF;
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
CREATE TRIGGER pcmso_pgr_change AFTER INSERT OR UPDATE OR DELETE ON public.pgr_documents FOR EACH ROW EXECUTE FUNCTION public.pcmso_detect_source_change();
CREATE TRIGGER pcmso_risk_change AFTER INSERT OR UPDATE OR DELETE ON public.pgr_risks FOR EACH ROW EXECUTE FUNCTION public.pcmso_detect_source_change();
CREATE TRIGGER pcmso_ghe_change AFTER INSERT OR UPDATE OR DELETE ON public.pgr_ghe FOR EACH ROW EXECUTE FUNCTION public.pcmso_detect_source_change();
CREATE TRIGGER pcmso_aep_change AFTER INSERT OR UPDATE OR DELETE ON public.aep_avaliacoes FOR EACH ROW EXECUTE FUNCTION public.pcmso_detect_source_change();
CREATE TRIGGER pcmso_factor_change AFTER INSERT OR UPDATE OR DELETE ON public.aep_fatores_avaliados FOR EACH ROW EXECUTE FUNCTION public.pcmso_detect_source_change();
CREATE TRIGGER pcmso_link_change AFTER INSERT OR UPDATE OR DELETE ON public.aep_pgr_vinculo FOR EACH ROW EXECUTE FUNCTION public.pcmso_detect_source_change();