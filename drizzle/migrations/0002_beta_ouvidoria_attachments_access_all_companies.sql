DROP POLICY IF EXISTS beta_ouvidoria_storage_read ON storage.objects;
CREATE POLICY beta_ouvidoria_storage_read ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'beta-ouvidoria-attachments' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.beta_ouvidoria_attachments a
      JOIN public.beta_ouvidoria_reports r ON r.id = a.report_id
      WHERE a.file_path = storage.objects.name
        AND (public.user_in_company(auth.uid(), r.company_id) OR public.user_manages_company(auth.uid(), r.company_id))
    )
  )
);

DROP POLICY IF EXISTS beta_attachments_select_company ON public.beta_ouvidoria_attachments;
CREATE POLICY beta_attachments_select_company ON public.beta_ouvidoria_attachments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.beta_ouvidoria_reports r
  WHERE r.id = beta_ouvidoria_attachments.report_id
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.user_in_company(auth.uid(), r.company_id)
         OR public.user_manages_company(auth.uid(), r.company_id))
));