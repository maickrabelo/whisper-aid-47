-- Piloto: testes desfeitos por exceção final; exige a importação/revisão piloto existente.
BEGIN;
SELECT set_config('request.jwt.claims','{"sub":"4b69c13a-70ae-45ce-8b18-20a3b922fcee","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.pcmso_inventory_reviews WHERE snapshot_id IN (SELECT id FROM public.pcmso_source_snapshots WHERE program_id='3aba417b-66a7-4d01-9266-e24f1b482c66')) THEN RAISE EXCEPTION 'Pré-condição: revisão piloto ausente'; END IF;
END $$;
DO $$ BEGIN
 UPDATE public.pcmso_inventory_reviews SET company_id='00000000-0000-0000-0000-000000000001' WHERE snapshot_id IN (SELECT id FROM public.pcmso_source_snapshots WHERE program_id='3aba417b-66a7-4d01-9266-e24f1b482c66');
 RAISE EXCEPTION 'FAIL empresa cruzada';
EXCEPTION WHEN raise_exception THEN IF SQLERRM='FAIL empresa cruzada' THEN RAISE; END IF; END $$;
UPDATE public.pcmso_programs SET status='arquivado' WHERE id='3aba417b-66a7-4d01-9266-e24f1b482c66';
DO $$ BEGIN
 UPDATE public.pcmso_inventory_reviews SET notes='Não deve gravar' WHERE snapshot_id IN (SELECT id FROM public.pcmso_source_snapshots WHERE program_id='3aba417b-66a7-4d01-9266-e24f1b482c66');
 RAISE EXCEPTION 'FAIL arquivado';
EXCEPTION WHEN raise_exception THEN IF SQLERRM='FAIL arquivado' THEN RAISE; END IF; END $$;
DO $$ BEGIN RAISE EXCEPTION 'REVIEW_TESTS empresa cruzada=PASS | arquivado=PASS'; END $$;
ROLLBACK;