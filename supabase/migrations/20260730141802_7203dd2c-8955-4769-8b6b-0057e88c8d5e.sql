-- Backfill: perfis de colaboradores SST sem gestora ativa
UPDATE public.profiles p
SET sst_manager_id = m.sst_manager_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, sst_manager_id
  FROM public.user_sst_managers
  ORDER BY user_id, is_default DESC NULLS LAST, created_at ASC
) m
WHERE m.user_id = p.id AND p.sst_manager_id IS NULL;

-- Sincroniza automaticamente ao criar vínculo
CREATE OR REPLACE FUNCTION public.sync_usm_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
     SET sst_manager_id = NEW.sst_manager_id
   WHERE id = NEW.user_id AND sst_manager_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_usm_to_profile ON public.user_sst_managers;
CREATE TRIGGER trg_sync_usm_to_profile
AFTER INSERT ON public.user_sst_managers
FOR EACH ROW EXECUTE FUNCTION public.sync_usm_to_profile();