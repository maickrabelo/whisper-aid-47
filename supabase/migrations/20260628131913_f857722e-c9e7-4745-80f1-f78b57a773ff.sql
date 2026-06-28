
-- Allow user_sst_managers collaborators to upload/view/update/delete training files of their SST manager
CREATE POLICY "SST collaborators upload training files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sst-trainings'
  AND EXISTS (
    SELECT 1 FROM public.user_sst_managers usm
    WHERE usm.user_id = auth.uid()
      AND (storage.foldername(name))[1] = usm.sst_manager_id::text
  )
);

CREATE POLICY "SST collaborators view training files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'sst-trainings'
  AND EXISTS (
    SELECT 1 FROM public.user_sst_managers usm
    WHERE usm.user_id = auth.uid()
      AND (storage.foldername(name))[1] = usm.sst_manager_id::text
  )
);

CREATE POLICY "SST collaborators update training files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'sst-trainings'
  AND EXISTS (
    SELECT 1 FROM public.user_sst_managers usm
    WHERE usm.user_id = auth.uid()
      AND (storage.foldername(name))[1] = usm.sst_manager_id::text
  )
);

CREATE POLICY "SST collaborators delete training files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'sst-trainings'
  AND EXISTS (
    SELECT 1 FROM public.user_sst_managers usm
    WHERE usm.user_id = auth.uid()
      AND (storage.foldername(name))[1] = usm.sst_manager_id::text
  )
);
