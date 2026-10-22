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
$$;
UPDATE public.feature_flags SET enabled = true WHERE feature_key = 'PCMSO_BETA';

-- Dados do PGR da empresa A: 2 trabalhadores válidos, 1 CPF repetido, 1 CPF inválido
INSERT INTO public.pgr_documents(id, company_id) VALUES ('dddddddd-0000-0000-0000-00000000000a','aaaaaaaa-0000-0000-0000-00000000000a');
INSERT INTO public.pgr_documents(id, company_id) VALUES ('dddddddd-0000-0000-0000-00000000000b','bbbbbbbb-0000-0000-0000-00000000000b');
INSERT INTO public.pgr_ghe(id, pgr_document_id, name, sector, role) VALUES
 ('eeeeeeee-0000-0000-0000-00000000000a','dddddddd-0000-0000-0000-00000000000a','GHE 1','Produção','Operador'),
 ('eeeeeeee-0000-0000-0000-00000000000c','dddddddd-0000-0000-0000-00000000000a','GHE 2','Manutenção','Mecânico'),
 ('eeeeeeee-0000-0000-0000-00000000000b','dddddddd-0000-0000-0000-00000000000b','GHE B','X','Y');
INSERT INTO public.pgr_ghe_workers(ghe_id, cpf, full_name) VALUES
 ('eeeeeeee-0000-0000-0000-00000000000a','529.982.247-25','Fulano'),
 ('eeeeeeee-0000-0000-0000-00000000000a','111.444.777-35','Ciclano'),
 ('eeeeeeee-0000-0000-0000-00000000000c','52998224725','Fulano'),
 ('eeeeeeee-0000-0000-0000-00000000000a','123','Sem CPF');

SELECT pg_temp.as_user('22222222-0000-0000-0000-000000000002');
INSERT INTO t_results VALUES ('Simulação não grava', true,
  ((public.pcmso_import_pgr_workers('aaaaaaaa-0000-0000-0000-00000000000a', true))->>'novos')::int = 2
  AND (SELECT count(*) FROM public.pcmso_workers) = 0);
SELECT public.pcmso_import_pgr_workers('aaaaaaaa-0000-0000-0000-00000000000a', false);
INSERT INTO t_results VALUES ('1ª importação cria 2', true, (SELECT count(*) = 2 FROM public.pcmso_workers));
INSERT INTO t_results VALUES ('2ª importação não duplica', true,
  ((public.pcmso_import_pgr_workers('aaaaaaaa-0000-0000-0000-00000000000a', false))->>'novos')::int = 0
  AND (SELECT count(*) = 2 FROM public.pcmso_workers));
INSERT INTO t_results VALUES ('CPF repetido vira 2 vínculos', true,
  (SELECT count(*) = 2 FROM public.pcmso_worker_history h JOIN public.pcmso_workers w ON w.id=h.worker_id WHERE w.cpf='52998224725'));

-- Mudança de função, desligamento e readmissão preservam histórico
SELECT public.pcmso_worker_event((SELECT id FROM public.pcmso_workers WHERE cpf='11144477735'), 'mudanca_funcao', '2026-01-10', 'Líder', 'Produção');
SELECT public.pcmso_worker_event((SELECT id FROM public.pcmso_workers WHERE cpf='11144477735'), 'desligamento', '2026-03-01');
SELECT public.pcmso_worker_event((SELECT id FROM public.pcmso_workers WHERE cpf='11144477735'), 'readmissao', '2026-06-01', 'Líder', 'Produção');
INSERT INTO t_results VALUES ('Histórico com 4 eventos', true,
  (SELECT count(*) = 4 FROM public.pcmso_worker_history h JOIN public.pcmso_workers w ON w.id=h.worker_id WHERE w.cpf='11144477735'));
INSERT INTO t_results VALUES ('Readmitido fica ativo', true, (SELECT status='ativo' FROM public.pcmso_workers WHERE cpf='11144477735'));

-- Referências cruzadas recusadas
DO $$ BEGIN
  INSERT INTO public.pcmso_worker_history(worker_id, company_id, event_type, ghe_id)
  VALUES ((SELECT id FROM public.pcmso_workers WHERE cpf='11144477735'), 'aaaaaaaa-0000-0000-0000-00000000000a', 'mudanca_funcao', 'eeeeeeee-0000-0000-0000-00000000000b');
  INSERT INTO t_results VALUES ('GHE de outra empresa recusado', true, false);
EXCEPTION WHEN raise_exception THEN INSERT INTO t_results VALUES ('GHE de outra empresa recusado', true, true); END $$;
DO $$ BEGIN
  INSERT INTO public.pcmso_worker_history(worker_id, company_id, event_type)
  VALUES ((SELECT id FROM public.pcmso_workers WHERE cpf='11144477735'), 'bbbbbbbb-0000-0000-0000-00000000000b', 'mudanca_funcao');
  INSERT INTO t_results VALUES ('Trabalhador em outra empresa recusado', true, false);
EXCEPTION WHEN insufficient_privilege OR foreign_key_violation OR check_violation THEN INSERT INTO t_results VALUES ('Trabalhador em outra empresa recusado', true, true); END $$;
DO $$ BEGIN
  PERFORM public.pcmso_import_pgr_workers('bbbbbbbb-0000-0000-0000-00000000000b', false);
  INSERT INTO t_results VALUES ('SST importa B bloqueado', true, false);
EXCEPTION WHEN insufficient_privilege THEN INSERT INTO t_results VALUES ('SST importa B bloqueado', true, true); END $$;
RESET role;

-- RH vê, não edita; sem vínculo não vê
SELECT pg_temp.as_user('11111111-0000-0000-0000-000000000001');
INSERT INTO t_results VALUES ('RH vê trabalhadores A', true, (SELECT count(*) = 2 FROM public.pcmso_workers));
DO $$ BEGIN
  INSERT INTO public.pcmso_workers(company_id, cpf, full_name) VALUES ('aaaaaaaa-0000-0000-0000-00000000000a','39053344705','X');
  INSERT INTO t_results VALUES ('RH cadastra bloqueado', true, false);
EXCEPTION WHEN insufficient_privilege OR check_violation THEN INSERT INTO t_results VALUES ('RH cadastra bloqueado', true, true); END $$;
RESET role;
SELECT pg_temp.as_user('44444444-0000-0000-0000-000000000004');
INSERT INTO t_results VALUES ('Sem vínculo não vê', true, (SELECT count(*) = 0 FROM public.pcmso_workers));
RESET role;

DO $$ BEGIN RAISE EXCEPTION 'PCMSO_TEST_RESULTS %', (SELECT string_agg(test || '=' || CASE WHEN expected = got THEN 'PASS' ELSE 'FAIL' END, ' | ') FROM t_results); END $$;
ROLLBACK;
