ALTER TABLE public.pcmso_esocial_preparations DROP CONSTRAINT IF EXISTS pcmso_esocial_preparations_simulation_check;
ALTER TABLE public.pcmso_esocial_preparations ALTER COLUMN simulation SET DEFAULT false;
DO $do$ DECLARE d text; BEGIN
 d := pg_get_functiondef('public.pcmso_pilot_prepare_s2220(uuid)'::regprocedure);
 d := replace(d, '''environment'',2', '''environment'',CASE WHEN coalesce((a.content->>''simulation'')::boolean,true) THEN 2 ELSE 1 END');
 d := replace(d, 'Registre a assinatura manual simulada antes', 'Registre a assinatura manual antes');
 d := replace(d, 'INSERT INTO public.pcmso_esocial_preparations(company_id,aso_id,event_id,payload,content_hash,actor_id) VALUES(a.company_id,a.id,eid,p,md5(p::text),auth.uid())', 'INSERT INTO public.pcmso_esocial_preparations(company_id,aso_id,event_id,payload,content_hash,actor_id,simulation) VALUES(a.company_id,a.id,eid,p,md5(p::text),auth.uid(),coalesce((a.content->>''simulation'')::boolean,true))');
 EXECUTE d;
END $do$;
