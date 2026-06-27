
INSERT INTO public.profiles (id, full_name, sst_manager_id)
VALUES
  ('4b69c13a-70ae-45ce-8b18-20a3b922fcee', 'Teste SST', '28feac76-795f-4d56-b386-3d56578dc41f'),
  ('743f968a-1626-4e0c-b1e0-303481763e68', 'Teste Admin', NULL),
  ('2e4a54d1-a635-4fab-a56e-203850bd2584', 'Teste Empresa', NULL)
ON CONFLICT (id) DO UPDATE SET sst_manager_id = COALESCE(public.profiles.sst_manager_id, EXCLUDED.sst_manager_id);
