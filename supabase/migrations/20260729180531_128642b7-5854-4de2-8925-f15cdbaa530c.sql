GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sst_managers TO authenticated;
GRANT ALL ON public.user_sst_managers TO service_role;

GRANT SELECT ON public.email_send_attempts TO authenticated;
GRANT ALL ON public.email_send_attempts TO service_role;

INSERT INTO public.user_sst_managers (user_id, sst_manager_id, is_default)
SELECT p.id, p.sst_manager_id, true
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'sst'
WHERE p.sst_manager_id IS NOT NULL
ON CONFLICT (user_id, sst_manager_id) DO UPDATE
SET is_default = COALESCE(public.user_sst_managers.is_default, EXCLUDED.is_default);

CREATE OR REPLACE FUNCTION public.sync_profile_sst_manager_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sst_manager_id IS NOT NULL THEN
    INSERT INTO public.user_sst_managers (user_id, sst_manager_id, is_default)
    VALUES (NEW.id, NEW.sst_manager_id, true)
    ON CONFLICT (user_id, sst_manager_id) DO UPDATE
    SET is_default = true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_sst_manager_link ON public.profiles;
CREATE TRIGGER trg_sync_profile_sst_manager_link
AFTER INSERT OR UPDATE OF sst_manager_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_sst_manager_link();