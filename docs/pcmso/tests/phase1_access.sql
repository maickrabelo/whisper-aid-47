-- PCMSO Fase 1 — testes de acesso (rodam em transação e são desfeitos no final).
-- Cenário: Empresa A e Empresa B; usuários: RH da A, SST da A (sem vínculo com B),
-- médico responsável da A, admin, e usuário sem vínculo.
BEGIN;

CREATE TEMP TABLE t_results(test text, expected boolean, got boolean) ON COMMIT DROP;
GRANT ALL ON t_results TO authenticated;

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

-- 1) Flag desligada (padrão): ninguém acessa
SELECT pg_temp.as_user('22222222-0000-0000-0000-000000000002');
INSERT INTO t_results VALUES ('flag off: SST view A', false, public.pcmso_can('aaaaaaaa-0000-0000-0000-00000000000a','program.view'));
RESET role;

UPDATE public.feature_flags SET enabled = true WHERE feature_key = 'PCMSO_BETA';

-- 2) SST da A
SELECT pg_temp.as_user('22222222-0000-0000-0000-000000000002');
INSERT INTO t_results VALUES
 ('SST view A', true,  public.pcmso_can('aaaaaaaa-0000-0000-0000-00000000000a','program.view')),
 ('SST prepare A', true, public.pcmso_can('aaaaaaaa-0000-0000-0000-00000000000a','program.prepare')),
 ('SST approve A (sem atribuição)', false, public.pcmso_can('aaaaaaaa-0000-0000-0000-00000000000a','program.approve')),
 ('SST clinical A', false, public.pcmso_can('aaaaaaaa-0000-0000-0000-00000000000a','clinical.read')),
 ('SST view B', false, public.pcmso_can('bbbbbbbb-0000-0000-0000-00000000000b','program.view'));
INSERT INTO public.pcmso_programs(company_id, title) VALUES ('aaaaaaaa-0000-0000-0000-00000000000a','PCMSO TESTE A');
INSERT INTO t_results VALUES ('SST lista só A', true, (SELECT count(*) = 1 FROM public.pcmso_accessible_companies()));
DO $$ BEGIN
  INSERT INTO public.pcmso_programs(company_id, title) VALUES ('bbbbbbbb-0000-0000-0000-00000000000b','INVASAO');
  INSERT INTO t_results VALUES ('SST insert B bloqueado', true, false);
EXCEPTION WHEN insufficient_privilege OR check_violation THEN
  INSERT INTO t_results VALUES ('SST insert B bloqueado', true, true);
END $$;
DO $$ BEGIN
  UPDATE public.pcmso_programs SET status='aprovado' WHERE title='PCMSO TESTE A';
  INSERT INTO t_results VALUES ('SST aprovar bloqueado', true, false);
EXCEPTION WHEN raise_exception THEN
  INSERT INTO t_results VALUES ('SST aprovar bloqueado', true, true);
END $$;
RESET role;

-- 3) RH da A
SELECT pg_temp.as_user('11111111-0000-0000-0000-000000000001');
INSERT INTO t_results VALUES
 ('RH view A', true, public.pcmso_can('aaaaaaaa-0000-0000-0000-00000000000a','program.view')),
 ('RH prepare A', false, public.pcmso_can('aaaaaaaa-0000-0000-0000-00000000000a','program.prepare')),
 ('RH clinical A', false, public.pcmso_can('aaaaaaaa-0000-0000-0000-00000000000a','clinical.read')),
 ('RH vê programa A', true, (SELECT count(*) = 1 FROM public.pcmso_programs)),
 ('RH view B', false, public.pcmso_can('bbbbbbbb-0000-0000-0000-00000000000b','program.view'));
RESET role;

-- 4) Médico responsável da A
SELECT pg_temp.as_user('33333333-0000-0000-0000-000000000003');
INSERT INTO t_results VALUES
 ('Médico approve A', true, public.pcmso_can('aaaaaaaa-0000-0000-0000-00000000000a','program.approve')),
 ('Médico clinical A', true, public.pcmso_can('aaaaaaaa-0000-0000-0000-00000000000a','clinical.read')),
 ('Médico view B', false, public.pcmso_can('bbbbbbbb-0000-0000-0000-00000000000b','program.view'));
RESET role;

-- 5) Usuário sem vínculo (com flag liberada)
SELECT pg_temp.as_user('44444444-0000-0000-0000-000000000004');
INSERT INTO t_results VALUES
 ('Sem vínculo view A', false, public.pcmso_can('aaaaaaaa-0000-0000-0000-00000000000a','program.view')),
 ('Sem vínculo lê tabela', true, (SELECT count(*) = 0 FROM public.pcmso_programs)),
 ('Sem vínculo lista vazia', true, (SELECT count(*) = 0 FROM public.pcmso_accessible_companies()));
RESET role;

-- 6) Revogação imediata do médico
UPDATE public.pcmso_professional_assignments SET revoked_at = now() WHERE user_id = '33333333-0000-0000-0000-000000000003';
SELECT pg_temp.as_user('33333333-0000-0000-0000-000000000003');
INSERT INTO t_results VALUES ('Médico revogado', false, public.pcmso_can('aaaaaaaa-0000-0000-0000-00000000000a','clinical.read'));
RESET role;

SELECT test, expected, got, (expected = got) AS pass FROM t_results;
ROLLBACK;
