INSERT INTO public.user_companies (user_id, company_id)
SELECT p.id, a.company_id
FROM public.profiles p
JOIN public.company_sst_assignments a ON a.sst_manager_id = p.sst_manager_id
WHERE p.sst_manager_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'company')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = p.id AND uc.company_id = a.company_id
  );