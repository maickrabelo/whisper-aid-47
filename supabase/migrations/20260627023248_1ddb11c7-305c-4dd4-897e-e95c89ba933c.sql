UPDATE public.hotmart_product_plans hpp
SET plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'sr-sms' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM public.subscription_plans WHERE slug = 'sr-sms');