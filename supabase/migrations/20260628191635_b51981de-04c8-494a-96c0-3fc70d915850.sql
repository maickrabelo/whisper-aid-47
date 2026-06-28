INSERT INTO public.hotmart_product_plans (hotmart_product_id, plan_id, notes, is_active)
SELECT '7952854', id, 'Sr.SMS - product ID real Hotmart (complementa offer 1341462)', true
FROM public.subscription_plans WHERE slug = 'sr-sms'
ON CONFLICT (hotmart_product_id) DO UPDATE SET plan_id = EXCLUDED.plan_id, is_active = true, updated_at = now();