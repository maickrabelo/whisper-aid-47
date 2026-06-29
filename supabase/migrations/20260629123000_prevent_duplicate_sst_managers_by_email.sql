-- Prevent future duplicate SST manager records for the same login e-mail.
-- The webhook/importer already merges duplicates; this index is a database-level safety net.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sst_managers_unique_lower_email
ON public.sst_managers (lower(btrim(email)))
WHERE email IS NOT NULL AND btrim(email) <> '';
