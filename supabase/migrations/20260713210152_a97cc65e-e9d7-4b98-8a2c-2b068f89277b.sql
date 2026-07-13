UPDATE public.subscriptions s
SET amount_cents = sp.price_monthly_cents
FROM public.subscription_plans sp
WHERE s.plan_id = sp.id
  AND s.status IN ('active','trialing')
  AND s.billing_cycle = 'monthly'
  AND sp.price_monthly_cents IS NOT NULL
  AND sp.price_monthly_cents > 0
  AND s.amount_cents <> sp.price_monthly_cents;

UPDATE public.subscriptions s
SET amount_cents = sp.price_annual_cents
FROM public.subscription_plans sp
WHERE s.plan_id = sp.id
  AND s.status IN ('active','trialing')
  AND s.billing_cycle = 'annual'
  AND sp.price_annual_cents IS NOT NULL
  AND sp.price_annual_cents > 0
  AND s.amount_cents <> sp.price_annual_cents;