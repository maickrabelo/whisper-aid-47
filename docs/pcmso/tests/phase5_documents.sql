-- PCMSO Fase 4 — testes de acesso (rodam em transação e são desfeitos no final).
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

UPDATE public.pcmso_professional_assignments SET professional_name='Médico fictício' WHERE user_id='33333333-0000-0000-0000-000000000003';
SELECT pg_temp.as_user('22222222-0000-0000-0000-000000000002');
INSERT INTO public.pcmso_programs(id,company_id,title) VALUES ('77777777-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-00000000000a','PCMSO A');
SELECT public.pcmso_import_inventory('77777777-0000-0000-0000-00000000000a','dddddddd-0000-0000-0000-00000000000a');
INSERT INTO public.pcmso_inventory_reviews(company_id,snapshot_id,notes) SELECT company_id,id,'Inventário revisado' FROM public.pcmso_source_snapshots;
INSERT INTO public.pcmso_exam_catalog(id,company_id,name) VALUES ('88888888-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-00000000000a','Audiometria fictícia');

INSERT INTO public.pcmso_document_settings(program_id,company_id,valid_from,valid_to,objectives) VALUES('77777777-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-00000000000a','2026-10-23','2027-10-23','Objetivo original');
INSERT INTO public.pcmso_actions(id,program_id,company_id,title,responsible,due_date) VALUES('55555555-0000-0000-0000-00000000000a','77777777-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-00000000000a','Ação original','SST','2026-12-01');
UPDATE public.pcmso_actions SET status='em_andamento' WHERE id='55555555-0000-0000-0000-00000000000a';
INSERT INTO t_results VALUES('Histórico mantém planejada e em andamento',true,(SELECT count(*)=2 AND bool_or(content->>'status'='planejada') AND bool_or(content->>'status'='em_andamento') FROM public.pcmso_action_history));
INSERT INTO t_results VALUES('Minuta não é aprovação',true,public.pcmso_document_payload('77777777-0000-0000-0000-00000000000a')->>'kind'='minuta');
DO $$ BEGIN INSERT INTO public.pcmso_actions(program_id,company_id,title) VALUES('77777777-0000-0000-0000-00000000000a','bbbbbbbb-0000-0000-0000-00000000000b','Ação cruzada'); INSERT INTO t_results VALUES('Empresa cruzada bloqueada',true,false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_results VALUES('Empresa cruzada bloqueada',true,true); END $$;
INSERT INTO public.pcmso_protocols(company_id,program_id,exam_id,exam_name,exam_type,scope,justification) VALUES('aaaaaaaa-0000-0000-0000-00000000000a','77777777-0000-0000-0000-00000000000a','88888888-0000-0000-0000-00000000000a','X','admissional','todos','Revisão médica manual');
UPDATE public.pcmso_programs SET status='em_revisao';
RESET role; SELECT pg_temp.as_user('33333333-0000-0000-0000-000000000003');
UPDATE public.pcmso_programs SET status='aprovado';
CREATE TEMP TABLE frozen AS SELECT public.pcmso_document_payload('77777777-0000-0000-0000-00000000000a') AS payload;
INSERT INTO t_results VALUES('Aprovação inclui ações e documento',true,(SELECT payload->>'kind'='aprovado' AND payload->'content'->'document_settings'->>'objectives'='Objetivo original' AND payload->'content'->'actions'->0->>'title'='Ação original' FROM frozen));
DO $$ BEGIN UPDATE public.pcmso_actions SET title='Alteração'; INSERT INTO t_results VALUES('Ação aprovada imutável',true,false); EXCEPTION WHEN raise_exception THEN INSERT INTO t_results VALUES('Ação aprovada imutável',true,true); END $$;
DO $$ BEGIN UPDATE public.pcmso_document_settings SET objectives='Alteração'; INSERT INTO t_results VALUES('Documento aprovado imutável',true,false); EXCEPTION WHEN raise_exception THEN INSERT INTO t_results VALUES('Documento aprovado imutável',true,true); END $$;
RESET role; UPDATE public.companies SET name='Empresa alterada' WHERE id='aaaaaaaa-0000-0000-0000-00000000000a';
SELECT pg_temp.as_user('22222222-0000-0000-0000-000000000002');
INSERT INTO t_results VALUES('Export antigo mantém conteúdo e hash',true,(SELECT payload=public.pcmso_document_payload('77777777-0000-0000-0000-00000000000a') FROM frozen));
SELECT public.pcmso_create_revision('77777777-0000-0000-0000-00000000000a');
INSERT INTO t_results VALUES('Revisão copia ações como planejadas',true,(SELECT count(*)=1 FROM public.pcmso_actions a JOIN public.pcmso_programs p ON p.id=a.program_id WHERE p.revision_number=2 AND a.status='planejada'));
INSERT INTO t_results VALUES('Revisão copia documento sem alterar aprovado',true,(SELECT count(*)=2 FROM public.pcmso_document_settings WHERE objectives='Objetivo original'));
DO $$ BEGIN DELETE FROM public.pcmso_actions; INSERT INTO t_results VALUES('API não apaga ações',true,false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_results VALUES('API não apaga ações',true,true); END $$;
RESET role; SELECT pg_temp.as_user('44444444-0000-0000-0000-000000000004');
DO $$ BEGIN PERFORM public.pcmso_document_payload('77777777-0000-0000-0000-00000000000a'); INSERT INTO t_results VALUES('Export sem vínculo bloqueado',true,false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_results VALUES('Export sem vínculo bloqueado',true,true); END $$;
INSERT INTO t_results VALUES('Ações sem vínculo invisíveis',true,(SELECT count(*)=0 FROM public.pcmso_actions));
RESET role; UPDATE public.feature_flags SET enabled=false WHERE feature_key='PCMSO_BETA'; SELECT pg_temp.as_user('22222222-0000-0000-0000-000000000002');
DO $$ BEGIN PERFORM public.pcmso_document_payload('77777777-0000-0000-0000-00000000000a'); INSERT INTO t_results VALUES('Flag desativada bloqueia exportação',true,false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_results VALUES('Flag desativada bloqueia exportação',true,true); END $$;
RESET role;
SELECT test, CASE WHEN expected=got THEN 'PASS' ELSE 'FAIL' END AS result FROM t_results;
ROLLBACK;
