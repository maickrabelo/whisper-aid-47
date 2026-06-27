
-- Arquiva todos os planos existentes
UPDATE public.subscription_plans
SET is_active = false,
    visibility = 'hidden';

-- Cria o novo plano único Sr.SMS
INSERT INTO public.subscription_plans (
  name, slug, category, tier,
  base_price_cents, price_monthly_cents,
  min_employees, max_employees, max_companies,
  features, is_active, visibility,
  ai_enabled, ouvidoria_enabled, pgr_enabled,
  create_company_login, display_order
) VALUES (
  'Sr.SMS', 'sr-sms', 'sst', 'pro',
  9990, 9990,
  1, 999999, 9999,
  '["Acesso ilimitado","PGR/NR-1","HSE-IT","COPSOQ II","Burnout","Pesquisa de Clima","Treinamentos","Portal SST"]'::jsonb,
  true, 'public',
  false, false, true,
  true, 1
)
ON CONFLICT (slug) DO UPDATE SET
  is_active = true,
  visibility = 'public',
  price_monthly_cents = 9990,
  base_price_cents = 9990,
  ai_enabled = false,
  ouvidoria_enabled = false,
  pgr_enabled = true,
  name = 'Sr.SMS';
