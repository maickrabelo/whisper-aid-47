
INSERT INTO public.subscription_plans
(slug, name, visibility, category, max_companies, max_employees, price_monthly_cents, base_price_cents, min_employees, ai_enabled, ouvidoria_enabled, pgr_enabled, is_active, display_order, features)
VALUES
('sr-sms-150-empresas', 'Sr.SMS 150 Empresas', 'hotmart_only', 'manager', 150, 2000, 59000, 59000, 1, false, false, true, true, 60,
 '["Até 150 empresas","Até 2.000 vidas","PGR/NR-1","HSE-IT","COPSOQ II","Burnout","Pesquisa de Clima","Treinamentos","Portal SST"]'::jsonb),
('sr-sms-60-empresas', 'Sr.SMS 60 Empresas', 'hotmart_only', 'manager', 60, 3000, 35000, 35000, 1, false, false, true, true, 61,
 '["Até 60 empresas","Até 3.000 vidas","PGR/NR-1","HSE-IT","COPSOQ II","Burnout","Pesquisa de Clima","Treinamentos","Portal SST"]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name, visibility = EXCLUDED.visibility, max_companies = EXCLUDED.max_companies,
  max_employees = EXCLUDED.max_employees, price_monthly_cents = EXCLUDED.price_monthly_cents,
  base_price_cents = EXCLUDED.base_price_cents, is_active = true;

INSERT INTO public.hotmart_product_plans (hotmart_product_id, hotmart_offer_code, plan_id, is_active, notes)
SELECT v.pid, v.offer, p.id, true, v.notes
FROM (VALUES
  ('1360960','1wbep2s7','sr-sms-150-empresas','Sr.SMS R$ 590/mês - 150 empresas / 2 mil vidas'),
  ('1361848','sylce0yl','sr-sms-60-empresas','Sr.SMS R$ 350/mês - 60 empresas / 3 mil vidas')
) AS v(pid, offer, slug, notes)
JOIN public.subscription_plans p ON p.slug = v.slug
ON CONFLICT (hotmart_product_id) DO UPDATE SET
  hotmart_offer_code = EXCLUDED.hotmart_offer_code,
  plan_id = EXCLUDED.plan_id, is_active = true, notes = EXCLUDED.notes;
