-- Mark overdue Hotmart accounts so the payment-block overlay triggers
INSERT INTO public.subscriptions (owner_user_id, owner_email, plan_id, billing_cycle, status, provider, amount_cents, current_period_start, current_period_end, next_charge_date, metadata)
SELECT u.user_id, u.email, p.id, 'monthly', 'active', 'hotmart', 9790,
       (now() - interval '40 days'), (now() - interval '10 days'), (now() - interval '10 days'),
       jsonb_build_object('manual_overdue_block', true, 'blocked_at', now()::text, 'reason', 'Pagamento em atraso na Hotmart')
FROM (VALUES
  ('aadfef12-19e3-4578-8165-82a19141b6fb'::uuid, 'edirene.flores@gmail.com'),
  ('e7dba192-47f1-4172-bb87-af15be8555f0'::uuid, 'mariafernanda_225@hotmail.com')
) AS u(user_id, email)
CROSS JOIN (SELECT id FROM public.subscription_plans WHERE slug = 'sr-sms' LIMIT 1) p;

-- Ensure no lingering trial access for the overdue accounts
UPDATE public.sst_managers sm
SET subscription_status = 'inactive'
WHERE sm.id IN (
  SELECT pr.sst_manager_id FROM public.profiles pr
  WHERE pr.id IN (
    'b9daddfa-b34c-4cd6-9ab6-79e650b40f71','1de11ded-f8ad-4a86-9ff1-a05319e29709','a181c1a0-a443-4505-b6cc-8acc804c3dbb',
    '18a413e6-92a8-4de3-8922-3dc04aef5379','eaac832a-8c43-4a87-ae50-270928638c31','cc32a683-22bf-4213-87f8-2f702541ff6d',
    '62cc1019-206a-4668-b3b0-a5a98fe3a717','78a5f3a0-b9ef-4503-abdb-ff1351b8f4a1','e7dba192-47f1-4172-bb87-af15be8555f0',
    '012d5bd5-200e-4218-8a6b-6f7273444827','aadfef12-19e3-4578-8165-82a19141b6fb','c41b5c23-c5c2-4f02-8dc6-e4f0c7bda91a',
    'd37d6fbb-17b3-4fda-9fd1-828480acdc9a','aa16b02d-96fe-4efd-b405-a41314c67c8c'
  ) AND pr.sst_manager_id IS NOT NULL
);