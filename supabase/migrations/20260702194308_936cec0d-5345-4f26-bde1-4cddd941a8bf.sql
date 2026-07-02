
-- Helper: user has access to a given aep_id
CREATE OR REPLACE FUNCTION public.user_has_aep_access(_user_id uuid, _aep_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.aep_avaliacoes a
    WHERE a.id = _aep_id
      AND (
        has_role(_user_id, 'admin'::app_role)
        OR (has_role(_user_id, 'sst'::app_role) AND EXISTS (
          SELECT 1 FROM public.company_sst_assignments csa
          WHERE csa.company_id = a.company_id AND user_in_sst_manager(_user_id, csa.sst_manager_id)
        ))
        OR (has_role(_user_id, 'company'::app_role) AND user_in_company(_user_id, a.company_id))
      )
  );
$$;

CREATE POLICY "AEP evidencias read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'aep-evidencias'
  AND public.user_has_aep_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "AEP evidencias insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'aep-evidencias'
  AND public.user_has_aep_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "AEP evidencias delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'aep-evidencias'
  AND public.user_has_aep_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
