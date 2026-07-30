INSERT INTO public.profiles (id, full_name, sst_manager_id)
SELECT u.id,
       COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
       m.sst_manager_id
FROM auth.users u
JOIN (
  SELECT DISTINCT ON (user_id) user_id, sst_manager_id
  FROM public.user_sst_managers
  ORDER BY user_id, is_default DESC NULLS LAST, created_at ASC
) m ON m.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

CREATE OR REPLACE FUNCTION public.sync_usm_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id) THEN
    UPDATE public.profiles
       SET sst_manager_id = NEW.sst_manager_id
     WHERE id = NEW.user_id AND sst_manager_id IS NULL;
  ELSE
    INSERT INTO public.profiles (id, full_name, sst_manager_id)
    SELECT u.id,
           COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
           NEW.sst_manager_id
    FROM auth.users u WHERE u.id = NEW.user_id
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;