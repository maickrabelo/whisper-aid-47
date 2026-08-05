CREATE TABLE public.psychosocial_report_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_type text NOT NULL CHECK (assessment_type IN ('hseit','copsoq')),
  assessment_id uuid NOT NULL,
  company_id uuid,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_type, assessment_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.psychosocial_report_drafts TO authenticated;
GRANT ALL ON public.psychosocial_report_drafts TO service_role;

ALTER TABLE public.psychosocial_report_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage psychosocial report drafts"
ON public.psychosocial_report_drafts FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "SST and company users manage psychosocial report drafts"
ON public.psychosocial_report_drafts FOR ALL TO authenticated
USING (
  company_id IS NOT NULL AND (
    public.user_manages_company(auth.uid(), company_id)
    OR public.user_in_company(auth.uid(), company_id)
  )
)
WITH CHECK (
  company_id IS NOT NULL AND (
    public.user_manages_company(auth.uid(), company_id)
    OR public.user_in_company(auth.uid(), company_id)
  )
);

CREATE TRIGGER trg_psychosocial_report_drafts_updated
BEFORE UPDATE ON public.psychosocial_report_drafts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();