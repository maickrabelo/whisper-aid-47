-- 1) IA desligada por padrão em qualquer plano/conta
UPDATE public.subscription_plans SET ai_enabled = false WHERE ai_enabled IS DISTINCT FROM false;

CREATE OR REPLACE FUNCTION public.has_ai_access(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT false;
$function$;

CREATE OR REPLACE FUNCTION public.entity_has_ai_access(_company_id uuid, _sst_manager_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT false;
$function$;

-- 2) Reativar assinatura mensal do usuário (Sr.SMS 97,90)
UPDATE public.subscriptions
SET status = 'active'::subscription_status_enum,
    current_period_end = GREATEST(current_period_end, now() + interval '30 days')
WHERE id = '0e6b55cf-4f8e-4680-907b-c09065e1bd8d';