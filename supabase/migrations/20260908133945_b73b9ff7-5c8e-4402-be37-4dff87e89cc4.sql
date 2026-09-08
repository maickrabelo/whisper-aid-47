insert into public.subscription_plans
  (name, slug, category, tier, min_employees, max_employees, max_companies, base_price_cents, price_monthly_cents,
   visibility, ai_enabled, ouvidoria_enabled, pgr_enabled, create_company_login, is_active, features)
values
  ('LTCAT Avulso', 'ltcat-avulso', 'manager', 'ltcat', 1, 500, 5, 0, 0,
   'hotmart_only', false, false, false, false, true, '["Módulo LTCAT"]'::jsonb)
on conflict (slug) do update set is_active = true, visibility = 'hotmart_only';

insert into public.hotmart_product_plans (hotmart_product_id, plan_id, is_active)
select '1376605', id, true from public.subscription_plans where slug = 'ltcat-avulso'
on conflict do nothing;