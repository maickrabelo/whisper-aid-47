-- Release ASO/atendimentos to every company with PCMSO access (no pilot hardcode)
ALTER TABLE public.pcmso_clinical_entries DROP CONSTRAINT IF EXISTS pcmso_clinical_entries_simulation_check;
ALTER TABLE public.pcmso_clinical_entries ALTER COLUMN simulation SET DEFAULT false;
ALTER TABLE public.pcmso_asos DROP CONSTRAINT IF EXISTS pcmso_asos_simulation_check;
ALTER TABLE public.pcmso_asos ALTER COLUMN simulation SET DEFAULT false;
ALTER TABLE public.pcmso_exam_orders DROP CONSTRAINT IF EXISTS pcmso_exam_orders_simulation_check;
ALTER TABLE public.pcmso_exam_orders ALTER COLUMN simulation SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.pcmso_exam_can(_company_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
 SELECT public.pcmso_can(_company_id,'program.view') AND (public.has_feature_access('PCMSO_BETA',_company_id) OR public.has_feature_access('PCMSO_EXAMS_BETA',_company_id));
$$;
CREATE OR REPLACE FUNCTION public.pcmso_pilot_can(_company_id uuid,_clinical boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.pcmso_exam_can(_company_id) AND (NOT _clinical OR public.pcmso_can(_company_id,'clinical.write'));
$$;

DO $do$ DECLARE d text; BEGIN
 d := pg_get_functiondef('public.pcmso_pilot_issue_aso(uuid,text,date)'::regprocedure);
 d := replace(d, '''simulation'',true', '''simulation'',false');
 EXECUTE d;
END $do$;
ALTER TABLE public.pcmso_manual_signature_attestations DROP CONSTRAINT IF EXISTS pcmso_manual_signature_attestations_simulation_check;
ALTER TABLE public.pcmso_manual_signature_attestations ALTER COLUMN simulation SET DEFAULT false;
ALTER TABLE public.pcmso_evidence_uploads DROP CONSTRAINT IF EXISTS pcmso_evidence_uploads_simulation_check;
ALTER TABLE public.pcmso_evidence_uploads ALTER COLUMN simulation SET DEFAULT false;
