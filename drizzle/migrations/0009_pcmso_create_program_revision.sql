CREATE OR REPLACE FUNCTION public.pcmso_create_revision(_program_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.pcmso_programs; next_id uuid; s public.pcmso_source_snapshots; t public.pcmso_protocols; new_snapshot uuid;
BEGIN
 SELECT * INTO p FROM public.pcmso_programs WHERE id=_program_id FOR UPDATE;
 IF p.id IS NULL OR NOT public.pcmso_can(p.company_id,'program.prepare') THEN RAISE EXCEPTION 'Sem autorização' USING ERRCODE='42501'; END IF;
 IF p.status<>'aprovado' THEN RAISE EXCEPTION 'Somente programa aprovado pode originar revisão'; END IF;
 SELECT id INTO next_id FROM public.pcmso_programs WHERE previous_program_id=p.id;
 IF next_id IS NOT NULL THEN RETURN next_id; END IF;
 INSERT INTO public.pcmso_programs(company_id,title,previous_program_id) VALUES(p.company_id,p.title,p.id) RETURNING id INTO next_id;
 FOR s IN SELECT * FROM public.pcmso_source_snapshots WHERE program_id=p.id LOOP
  IF EXISTS(SELECT 1 FROM public.pgr_documents WHERE id=s.pgr_document_id AND company_id=p.company_id) THEN PERFORM public.pcmso_import_inventory(next_id,s.pgr_document_id); END IF;
 END LOOP;
 FOR t IN SELECT * FROM public.pcmso_protocols WHERE program_id=p.id AND active LOOP
  new_snapshot:=NULL;
  IF t.snapshot_id IS NOT NULL THEN
   SELECT ns.id INTO new_snapshot FROM public.pcmso_source_snapshots os JOIN public.pcmso_source_snapshots ns ON ns.pgr_document_id=os.pgr_document_id AND ns.program_id=next_id WHERE os.id=t.snapshot_id AND EXISTS(SELECT 1 FROM jsonb_array_elements(ns.content->'ghes') g WHERE g->>'id'=t.ghe_id::text) AND (t.risk_id IS NULL OR EXISTS(SELECT 1 FROM jsonb_array_elements(ns.content->'risks') r WHERE r->>'id'=t.risk_id::text AND r->>'ghe_id'=t.ghe_id::text));
   IF new_snapshot IS NULL THEN CONTINUE; END IF;
  END IF;
  INSERT INTO public.pcmso_protocols(company_id,program_id,exam_id,exam_name,exam_type,periodicity_months,scope,snapshot_id,ghe_id,risk_id,justification,notes) VALUES(p.company_id,next_id,t.exam_id,t.exam_name,t.exam_type,t.periodicity_months,t.scope,new_snapshot,t.ghe_id,t.risk_id,t.justification,t.notes);
 END LOOP;
 RETURN next_id;
END; $$;
REVOKE ALL ON FUNCTION public.pcmso_create_revision(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pcmso_create_revision(uuid) TO authenticated;