DO $$
DECLARE
  v_user_id UUID := '7c070af7-47fa-42d6-8ec1-5a446cef93b1';
  v_sst_manager_id UUID := 'fe46cd84-8b02-4e31-8498-d5a82a885d15';
BEGIN
  -- Link user to existing SST manager
  INSERT INTO public.user_sst_managers (user_id, sst_manager_id, is_default)
  VALUES (v_user_id, v_sst_manager_id, true)
  ON CONFLICT (user_id, sst_manager_id) DO NOTHING;

  -- Add sst role if not present
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'sst')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Update profile to point to SST manager
  UPDATE public.profiles
  SET sst_manager_id = v_sst_manager_id
  WHERE id = v_user_id;
END $$;