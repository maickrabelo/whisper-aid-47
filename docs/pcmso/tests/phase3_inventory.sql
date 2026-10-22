-- PCMSO Fase 1 — testes de acesso (rodam em transação e são desfeitos no final).
-- Cenário: Empresa A e Empresa B; usuários: RH da A, SST da A (sem vínculo com B),
-- médico responsável da A, admin, e usuário sem vínculo.
BEGIN;

CREATE TEMP TABLE t_results(test text, expected boolean, got boolean) ON COMMIT DROP;
GRANT ALL ON t_results TO authenticated;

INSERT INTO auth.users(id, email, aud, role) VALUES
 ('11111111-0000-0000-0000-000000000001','rh-a@example.invalid','authenticated','authenticated'),
 ('22222222-0000-0000-0000-000000000002','sst-a@example.invalid','authenticated','authenticated'),
 ('33333333-0000-0000-0000-000000000003','med-a@example.invalid','authenticated','authenticated'),
 ('44444444-0000-0000-0000-000000000004','none@example.invalid','authenticated','authenticated');
INSERT INTO public.companies(id, name) VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'TESTE PCMSO A'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'TESTE PCMSO B');

-- Usuários fictícios (só IDs; vínculos via tabelas do app)
-- rh_a 1111..., sst_a 2222..., med_a 3333..., none 4444...
INSERT INTO public.user_companies(user_id, company_id)
  VALUES ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a');
INSERT INTO public.sst_managers(id, name, email) VALUES ('22222222-9999-0000-0000-000000000000', 'SST TESTE', 'sst-teste@example.invalid');
INSERT INTO public.user_sst_managers(user_id, sst_manager_id)
  VALUES ('22222222-0000-0000-0000-000000000002', '22222222-9999-0000-0000-000000000000');
INSERT INTO public.company_sst_assignments(company_id, sst_manager_id)
  VALUES ('aaaaaaaa-0000-0000-0000-00000000000a', '22222222-9999-0000-0000-000000000000');
INSERT INTO public.pcmso_professional_assignments(user_id, company_id, clinical_role, crm, crm_uf)
  VALUES ('33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-00000000000a', 'responsavel', '000', 'SP');

-- Liberação comercial para todos os usuários de teste (todas as empresas)
INSERT INTO public.feature_access(feature_key, user_id, enabled) VALUES
  ('PCMSO_BETA','11111111-0000-0000-0000-000000000001', true),
  ('PCMSO_BETA','22222222-0000-0000-0000-000000000002', true),
  ('PCMSO_BETA','33333333-0000-0000-0000-000000000003', true),
  ('PCMSO_BETA','44444444-0000-0000-0000-000000000004', true);

CREATE OR REPLACE FUNCTION pg_temp.as_user(_uid text) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true),
         set_config('role', 'authenticated', true);
$$;
UPDATE public.feature_flags SET enabled = true WHERE feature_key = 'PCMSO_BETA';


INSERT INTO public.pgr_documents(id,company_id,title) VALUES
 ('dddddddd-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-00000000000a','Inventário A'),
 ('dddddddd-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-00000000000b','Inventário B');
INSERT INTO public.pgr_ghe(id,pgr_document_id,name) VALUES ('eeeeeeee-0000-0000-0000-00000000000a','dddddddd-0000-0000-0000-00000000000a','GHE A');
INSERT INTO public.pgr_risks(id,pgr_document_id,ghe_id,category,agent_name) VALUES ('99999999-0000-0000-0000-00000000000a','dddddddd-0000-0000-0000-00000000000a','eeeeeeee-0000-0000-0000-00000000000a','fisico','Ruído');
SELECT pg_temp.as_user('22222222-0000-0000-0000-000000000002');
INSERT INTO public.pcmso_programs(id,company_id,title) VALUES ('77777777-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-00000000000a','PCMSO A');
SELECT public.pcmso_import_inventory('77777777-0000-0000-0000-00000000000a','dddddddd-0000-0000-0000-00000000000a');
INSERT INTO t_results VALUES ('Importação com 1 risco',true,(SELECT jsonb_array_length(content->'risks')=1 FROM public.pcmso_source_snapshots));
CREATE TEMP TABLE t_copy AS SELECT id,source_hash,content FROM public.pcmso_source_snapshots;
SELECT public.pcmso_import_inventory('77777777-0000-0000-0000-00000000000a','dddddddd-0000-0000-0000-00000000000a');
INSERT INTO t_results VALUES ('Importação repetida mantém id e hash',true,(SELECT count(*)=1 AND bool_and(s.id=c.id AND s.source_hash=c.source_hash) FROM public.pcmso_source_snapshots s CROSS JOIN t_copy c));
DO $$ BEGIN
 PERFORM public.pcmso_import_inventory('77777777-0000-0000-0000-00000000000a','dddddddd-0000-0000-0000-00000000000b');
 INSERT INTO t_results VALUES ('PGR de outra empresa bloqueado',true,false);
EXCEPTION WHEN raise_exception THEN INSERT INTO t_results VALUES ('PGR de outra empresa bloqueado',true,true); END $$;
DO $$ BEGIN
 INSERT INTO public.pcmso_source_snapshots(company_id,program_id,pgr_document_id,content,source_hash) VALUES ('aaaaaaaa-0000-0000-0000-00000000000a','77777777-0000-0000-0000-00000000000a','dddddddd-0000-0000-0000-00000000000b','{}','forged');
 INSERT INTO t_results VALUES ('API direta origem cruzada bloqueada',true,false);
EXCEPTION WHEN raise_exception THEN INSERT INTO t_results VALUES ('API direta origem cruzada bloqueada',true,true); END $$;
DO $$ BEGIN
 UPDATE public.pcmso_programs SET status='aprovado' WHERE id='77777777-0000-0000-0000-00000000000a';
 INSERT INTO t_results VALUES ('SST não aprova',true,false);
EXCEPTION WHEN raise_exception THEN INSERT INTO t_results VALUES ('SST não aprova',true,true); END $$;
UPDATE public.pcmso_programs SET status='em_revisao' WHERE id='77777777-0000-0000-0000-00000000000a';
RESET role;
SELECT pg_temp.as_user('33333333-0000-0000-0000-000000000003');
UPDATE public.pcmso_programs SET status='aprovado' WHERE id='77777777-0000-0000-0000-00000000000a';
INSERT INTO t_results VALUES ('Médico aprova',true,(SELECT status='aprovado' FROM public.pcmso_programs WHERE id='77777777-0000-0000-0000-00000000000a'));
RESET role;
UPDATE public.pgr_risks SET agent_name='Ruído alterado' WHERE id='99999999-0000-0000-0000-00000000000a';
INSERT INTO t_results VALUES ('Mudança cria pendência',true,(SELECT count(*)=1 FROM public.pcmso_change_requests WHERE resolved_at IS NULL));
INSERT INTO t_results VALUES ('Cópia aprovada não muda',true,(SELECT s.content=c.content AND s.source_hash=c.source_hash FROM public.pcmso_source_snapshots s CROSS JOIN t_copy c));
SELECT pg_temp.as_user('33333333-0000-0000-0000-000000000003');
DO $$ BEGIN
 PERFORM public.pcmso_import_inventory('77777777-0000-0000-0000-00000000000a','dddddddd-0000-0000-0000-00000000000a');
 INSERT INTO t_results VALUES ('Reimportação aprovado bloqueada',true,false);
EXCEPTION WHEN raise_exception THEN INSERT INTO t_results VALUES ('Reimportação aprovado bloqueada',true,true); END $$;
DO $$ BEGIN
 UPDATE public.pcmso_source_snapshots SET content='{}';
 INSERT INTO t_results VALUES ('Edição direta aprovado bloqueada',true,false);
EXCEPTION WHEN raise_exception THEN INSERT INTO t_results VALUES ('Edição direta aprovado bloqueada',true,true); END $$;
RESET role;
SELECT pg_temp.as_user('44444444-0000-0000-0000-000000000004');
INSERT INTO t_results VALUES ('Sem vínculo não lê',true,(SELECT count(*)=0 FROM public.pcmso_source_snapshots));
RESET role;
SELECT pg_temp.as_user('11111111-0000-0000-0000-000000000001');
INSERT INTO t_results VALUES ('RH lê apenas empresa A',true,(SELECT count(*)=1 FROM public.pcmso_source_snapshots));
RESET role;
UPDATE public.feature_flags SET enabled=false WHERE feature_key='PCMSO_BETA';
SELECT pg_temp.as_user('33333333-0000-0000-0000-000000000003');
INSERT INTO t_results VALUES ('Flag desligada não lê',true,(SELECT count(*)=0 FROM public.pcmso_source_snapshots));
RESET role;
DO $$ BEGIN RAISE EXCEPTION 'PCMSO_TEST_RESULTS %', (SELECT string_agg(test || '=' || CASE WHEN expected = got THEN 'PASS' ELSE 'FAIL' END, ' | ') FROM t_results); END $$;
ROLLBACK;
