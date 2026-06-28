
ALTER TABLE public.hotmart_product_plans
  ADD COLUMN IF NOT EXISTS hotmart_offer_code text;

-- Allow same product_id with different offers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotmart_product_plans_hotmart_product_id_key') THEN
    ALTER TABLE public.hotmart_product_plans DROP CONSTRAINT hotmart_product_plans_hotmart_product_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS hotmart_product_plans_product_offer_uniq
  ON public.hotmart_product_plans (hotmart_product_id, COALESCE(hotmart_offer_code, ''));

-- Set existing rows (97.90 monthly)
UPDATE public.hotmart_product_plans
  SET hotmart_offer_code = 'cxxuc6kw'
  WHERE hotmart_product_id IN ('7952854','1341462') AND hotmart_offer_code IS NULL;

-- Insert trial offer mapping (9.90 → teste-sms)
INSERT INTO public.hotmart_product_plans (hotmart_product_id, hotmart_offer_code, plan_id, notes, is_active)
SELECT '7952854', 'zwf07kdh', id, 'Oferta R$ 9,90 - Trial 7 dias (teste-sms)', true
FROM public.subscription_plans WHERE slug = 'teste-sms'
ON CONFLICT DO NOTHING;
