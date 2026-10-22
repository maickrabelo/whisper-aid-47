CREATE TABLE public.pcmso_inventory_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), snapshot_id uuid NOT NULL REFERENCES public.pcmso_source_snapshots(id), notes text NOT NULL DEFAULT '', reviewed_by uuid, reviewed_at timestamptz NOT NULL DEFAULT now(), UNIQUE(snapshot_id)
);
GRANT SELECT,INSERT,UPDATE ON public.pcmso_inventory_reviews TO authenticated;
GRANT ALL ON public.pcmso_inventory_reviews TO service_role;
ALTER TABLE public.pcmso_inventory_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY review_read ON public.pcmso_inventory_reviews FOR SELECT TO authenticated USING(public.pcmso_can(company_id,'program.view'));
CREATE POLICY review_insert ON public.pcmso_inventory_reviews FOR INSERT TO authenticated WITH CHECK(public.pcmso_can(company_id,'program.prepare'));
CREATE POLICY review_update ON public.pcmso_inventory_reviews FOR UPDATE TO authenticated USING(public.pcmso_can(company_id,'program.prepare')) WITH CHECK(public.pcmso_can(company_id,'program.prepare'));
CREATE OR REPLACE FUNCTION public.pcmso_inventory_review_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.pcmso_programs;
BEGIN
 SELECT p1.* INTO p FROM public.pcmso_source_snapshots s JOIN public.pcmso_programs p1 ON p1.id=s.program_id WHERE s.id=NEW.snapshot_id FOR UPDATE OF p1;
 IF p.id IS NULL OR p.company_id<>NEW.company_id THEN RAISE EXCEPTION 'Empresa da revisão inválida'; END IF;
 IF p.status NOT IN ('rascunho','em_revisao') THEN RAISE EXCEPTION 'Programa aprovado ou arquivado não aceita alterações'; END IF;
 IF TG_OP='UPDATE' AND (NEW.snapshot_id<>OLD.snapshot_id OR NEW.company_id<>OLD.company_id) THEN RAISE EXCEPTION 'Vínculo da revisão não pode mudar'; END IF;
 NEW.reviewed_by:=auth.uid(); NEW.reviewed_at:=now(); RETURN NEW;
END; $$;
CREATE TRIGGER inventory_review_guard BEFORE INSERT OR UPDATE ON public.pcmso_inventory_reviews FOR EACH ROW EXECUTE FUNCTION public.pcmso_inventory_review_guard();
CREATE TRIGGER inventory_review_audit AFTER INSERT OR UPDATE ON public.pcmso_inventory_reviews FOR EACH ROW EXECUTE FUNCTION public.pcmso_audit_trigger();
CREATE OR REPLACE FUNCTION public.pcmso_inventory_aep_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.aep_avaliacoes a LEFT JOIN public.pgr_ghe g ON g.id=a.ghe_id LEFT JOIN public.pgr_documents d ON d.id=g.pgr_document_id WHERE a.company_id=NEW.company_id AND (a.pgr_document_id=NEW.pgr_document_id OR g.pgr_document_id=NEW.pgr_document_id) AND a.ghe_id IS NOT NULL AND (d.company_id IS DISTINCT FROM NEW.company_id OR (a.pgr_document_id IS NOT NULL AND g.pgr_document_id IS DISTINCT FROM a.pgr_document_id))) THEN RAISE EXCEPTION 'GHE da AEP incompatível com a empresa ou PGR'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER inventory_aep_guard BEFORE INSERT OR UPDATE ON public.pcmso_source_snapshots FOR EACH ROW EXECUTE FUNCTION public.pcmso_inventory_aep_guard();