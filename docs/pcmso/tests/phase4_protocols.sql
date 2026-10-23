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
INSERT INTO t_results VALUES ('Nenhum exame gerado pelo score do risco',true,(SELECT count(*)=0 FROM public.pcmso_protocols));
DO $$ BEGIN
 INSERT INTO public.pcmso_protocols(company_id,program_id,exam_id,exam_name,exam_type,scope,justification) VALUES('aaaaaaaa-0000-0000-0000-00000000000a','77777777-0000-0000-0000-00000000000a','88888888-0000-0000-0000-00000000000a','forjado','admissional','todos','');
 INSERT INTO t_results VALUES ('Sem justificativa bloqueado',true,false);
EXCEPTION WHEN check_violation THEN INSERT INTO t_results VALUES ('Sem justificativa bloqueado',true,true); END $$;
INSERT INTO public.pcmso_protocols(id,company_id,program_id,exam_id,exam_name,exam_type,periodicity_months,scope,snapshot_id,ghe_id,risk_id,justification)
SELECT '66666666-0000-0000-0000-00000000000a',company_id,program_id,'88888888-0000-0000-0000-00000000000a','forjado','periodico',12,'ghe',id,'eeeeeeee-0000-0000-0000-00000000000a','99999999-0000-0000-0000-00000000000a','Avaliação manual pendente do médico' FROM public.pcmso_source_snapshots;
INSERT INTO t_results VALUES ('SST prepara periodicidade 12 meses',true,(SELECT periodicity_months=12 AND exam_name='Audiometria fictícia' FROM public.pcmso_protocols));
UPDATE public.pcmso_protocols SET periodicity_months=6;
INSERT INTO t_results VALUES ('Histórico preserva periodicidade anterior',true,(SELECT count(*)=2 AND bool_or((content->>'periodicity_months')::int=12) AND bool_or((content->>'periodicity_months')::int=6) FROM public.pcmso_protocol_history));
DO $$ BEGIN
 INSERT INTO public.pcmso_protocols(company_id,program_id,exam_id,exam_name,exam_type,scope,snapshot_id,ghe_id,justification) SELECT company_id,program_id,'88888888-0000-0000-0000-00000000000a','X','admissional','ghe',id,'eeeeeeee-0000-0000-0000-00000000000b','manual' FROM public.pcmso_source_snapshots;
 INSERT INTO t_results VALUES ('GHE cruzado bloqueado',true,false);
EXCEPTION WHEN raise_exception THEN INSERT INTO t_results VALUES ('GHE cruzado bloqueado',true,true); END $$;
UPDATE public.pcmso_programs SET status='em_revisao';
DO $$ BEGIN
 UPDATE public.pcmso_protocols SET notes='edição';
 INSERT INTO t_results VALUES ('Protocolo em revisão bloqueado',true,false);
EXCEPTION WHEN raise_exception THEN INSERT INTO t_results VALUES ('Protocolo em revisão bloqueado',true,true); END $$;
DO $$ BEGIN
 UPDATE public.pcmso_programs SET status='aprovado';
 INSERT INTO t_results VALUES ('SST não aprova sem atribuição',true,false);
EXCEPTION WHEN raise_exception THEN INSERT INTO t_results VALUES ('SST não aprova sem atribuição',true,true); END $$;
RESET role;
SELECT pg_temp.as_user('33333333-0000-0000-0000-000000000003');
UPDATE public.pcmso_programs SET status='aprovado';
INSERT INTO t_results VALUES ('Médico aprova e registra identidade',true,(SELECT approved_by='33333333-0000-0000-0000-000000000003' AND physician->>'crm'='000' AND physician->>'name'='Médico fictício' FROM public.pcmso_program_versions));
CREATE TEMP TABLE t_version AS SELECT content,content_hash FROM public.pcmso_program_versions;
DO $$ BEGIN
 UPDATE public.pcmso_protocols SET notes='editar aprovado';
 INSERT INTO t_results VALUES ('API não edita aprovado',true,false);
EXCEPTION WHEN raise_exception THEN INSERT INTO t_results VALUES ('API não edita aprovado',true,true); END $$;
DO $$ BEGIN
 DELETE FROM public.pcmso_protocols WHERE id='66666666-0000-0000-0000-00000000000a';
 INSERT INTO t_results VALUES ('API não apaga protocolo',true,false);
EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_results VALUES ('API não apaga protocolo',true,true); END $$;
DO $$ BEGIN
 UPDATE public.pcmso_program_versions SET content='{}';
 INSERT INTO t_results VALUES ('API não altera versão aprovada',true,false);
EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_results VALUES ('API não altera versão aprovada',true,true); END $$;
RESET role;
UPDATE public.companies SET name='Empresa alterada' WHERE id='aaaaaaaa-0000-0000-0000-00000000000a';
SELECT pg_temp.as_user('22222222-0000-0000-0000-000000000002');
SELECT public.pcmso_create_revision('77777777-0000-0000-0000-00000000000a');
SELECT public.pcmso_create_revision('77777777-0000-0000-0000-00000000000a');
INSERT INTO t_results VALUES ('Revisão idempotente preserva versão 1',true,(SELECT count(*)=2 AND max(revision_number)=2 FROM public.pcmso_programs));
INSERT INTO t_results VALUES ('Versão antiga mantém conteúdo e hash',true,(SELECT v.content=t.content AND v.content_hash=t.content_hash AND v.content->'company'->>'name'='TESTE PCMSO A' FROM public.pcmso_program_versions v CROSS JOIN t_version t));
INSERT INTO t_results VALUES ('Nova revisão copia protocolos sem aprovar',true,(SELECT count(*)=1 FROM public.pcmso_protocols t JOIN public.pcmso_programs p ON p.id=t.program_id WHERE p.status='rascunho' AND p.revision_number=2));
RESET role;
SELECT pg_temp.as_user('44444444-0000-0000-0000-000000000004');
INSERT INTO t_results VALUES ('Sem vínculo não lê protocolos nem versões',true,(SELECT (SELECT count(*) FROM public.pcmso_protocols)=0 AND (SELECT count(*) FROM public.pcmso_program_versions)=0));
RESET role;
SELECT pg_temp.as_user('11111111-0000-0000-0000-000000000001');
INSERT INTO t_results VALUES ('RH só lê empresa A',true,(SELECT count(*)=2 AND bool_and(company_id='aaaaaaaa-0000-0000-0000-00000000000a') FROM public.pcmso_protocols));
DO $$ BEGIN
 INSERT INTO public.pcmso_exam_catalog(company_id,name) VALUES('aaaaaaaa-0000-0000-0000-00000000000a','Exame indevido');
 INSERT INTO t_results VALUES ('RH não prepara',true,false);
EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_results VALUES ('RH não prepara',true,true); END $$;
RESET role;
UPDATE public.pcmso_professional_assignments SET revoked_at=now() WHERE user_id='33333333-0000-0000-0000-000000000003';
SELECT pg_temp.as_user('33333333-0000-0000-0000-000000000003');
INSERT INTO t_results VALUES ('Médico revogado perde acesso',true,(SELECT count(*)=0 FROM public.pcmso_program_versions));
RESET role;
UPDATE public.feature_flags SET enabled=false WHERE feature_key='PCMSO_BETA';
SELECT pg_temp.as_user('22222222-0000-0000-0000-000000000002');
INSERT INTO t_results VALUES ('Flag desligada bloqueia leitura',true,(SELECT count(*)=0 FROM public.pcmso_protocols));
DO $$ BEGIN
 INSERT INTO public.pcmso_exam_catalog(company_id,name) VALUES('aaaaaaaa-0000-0000-0000-00000000000a','Exame flag off');
 INSERT INTO t_results VALUES ('Flag desligada bloqueia novas operações',true,false);
EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_results VALUES ('Flag desligada bloqueia novas operações',true,true); END $$;
RESET role;
DO $$ BEGIN RAISE EXCEPTION 'PCMSO_TEST_RESULTS %', (SELECT string_agg(test || '=' || CASE WHEN expected = got THEN 'PASS' ELSE 'FAIL' END, ' | ') FROM t_results); END $$;
ROLLBACK;
