-- Run through the privileged test channel; all temporary physician assignments and fixtures roll back.
BEGIN;
SELECT set_config('request.jwt.claims','{"sub":"4b69c13a-70ae-45ce-8b18-20a3b922fcee","role":"authenticated"}',true);
DO $$
DECLARE c uuid:='052c8fc4-b377-4f86-84a5-5c581a2896e5'; u uuid:='4b69c13a-70ae-45ce-8b18-20a3b922fcee'; o public.pcmso_exam_orders; oid uuid; eid uuid; aid uuid; sid uuid; rid uuid; assignment uuid; content jsonb; ex jsonb;
BEGIN
 IF public.pcmso_pilot_can(c,true) THEN RAISE EXCEPTION 'Automatic physician access'; END IF;
 IF public.pcmso_pilot_can('aaaaaaaa-0000-0000-0000-00000000000a',true) THEN RAISE EXCEPTION 'Cross-company access'; END IF;
 IF has_table_privilege('authenticated','public.pcmso_clinical_entries','SELECT') OR has_table_privilege('authenticated','public.pcmso_asos','INSERT') OR has_table_privilege('authenticated','public.pcmso_annual_reports','UPDATE') THEN RAISE EXCEPTION 'Direct API privileges'; END IF;
 INSERT INTO public.pcmso_professional_assignments(user_id,company_id,clinical_role,professional_name,crm,crm_uf) VALUES(u,c,'responsavel','Médico FICTÍCIO transacional','000','SP') RETURNING id INTO assignment;
 SELECT * INTO o FROM public.pcmso_exam_orders WHERE company_id=c LIMIT 1;
 INSERT INTO public.pcmso_exam_orders(company_id,worker_id,program_id,protocol_id,request_key,worker_snapshot,protocol_snapshot,due_date,scheduled_date,status,created_by) VALUES(c,o.worker_id,o.program_id,o.protocol_id,gen_random_uuid(),o.worker_snapshot,o.protocol_snapshot,current_date,current_date,'compareceu',u) RETURNING id INTO oid;
 eid:=public.pcmso_pilot_record_encounter(oid,current_date,'Registro FICTÍCIO: desfazer no fim',jsonb_build_array(jsonb_build_object('code','0295','name','Avaliação clínica ocupacional','date',current_date)));
 BEGIN PERFORM public.pcmso_pilot_issue_aso(eid,NULL,current_date); RAISE EXCEPTION 'Missing fitness accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Missing fitness accepted' THEN RAISE; END IF; END;
 aid:=public.pcmso_pilot_issue_aso(eid,'apto',current_date);
 IF public.pcmso_pilot_issue_aso(eid,'apto',current_date)<>aid THEN RAISE EXCEPTION 'ASO retry duplicate'; END IF;
 content:=public.pcmso_pilot_aso_payload(aid);
 IF content->'content' ? 'notes' THEN RAISE EXCEPTION 'Clinical notes leaked'; END IF;
 BEGIN UPDATE public.pcmso_asos SET content='{}' WHERE id=aid; RAISE EXCEPTION 'ASO mutable'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='ASO mutable' THEN RAISE; END IF; END;
 BEGIN PERFORM public.pcmso_pilot_prepare_s2220(aid); RAISE EXCEPTION 'Unsigned ASO export accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Unsigned ASO export accepted' THEN RAISE; END IF; END;
 sid:=public.pcmso_pilot_attest_manual_signature(aid,current_date,'Assinatura MANUAL FICTÍCIA');
 -- The pilot company CNPJ may be incomplete; export correctly fails closed instead of inventing it.
 IF regexp_replace(coalesce(content->'content'->'company'->>'cnpj',''),'[^A-Z0-9]','','g') ~ '^[A-Z0-9]{12}[0-9]{2}$' THEN
  ex:=public.pcmso_pilot_prepare_s2220(aid);
  IF ex->>'status'<>'preparado_nao_transmitido' OR (ex->'payload'->>'transmitted')::boolean THEN RAISE EXCEPTION 'Transmission state'; END IF;
 END IF;
 rid:=public.pcmso_pilot_annual_report(c,extract(year from current_date)::int);
 IF NOT EXISTS(SELECT 1 FROM public.pcmso_annual_reports r WHERE r.id=rid AND r.content->>'status'='suprimido' AND r.content->'totals'='null'::jsonb AND r.content->>'threshold'='5') THEN RAISE EXCEPTION 'Threshold 5 suppression'; END IF;
 UPDATE public.pcmso_professional_assignments SET revoked_at=now() WHERE id=assignment;
 IF public.pcmso_pilot_can(c,true) THEN RAISE EXCEPTION 'Revoked physician still authorized'; END IF;
 BEGIN PERFORM public.pcmso_pilot_aso_payload(aid); RAISE EXCEPTION 'Revoked download accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF NOT public.pcmso_valid_cpf('52998224725') OR public.pcmso_valid_cpf('11111111111') THEN RAISE EXCEPTION 'CPF rule'; END IF;
 RAISE NOTICE 'PASS: clinical segregation, company isolation, grants, manual fitness, ASO retry/snapshot, signature, suppression 5, revocation, CPF';
END $$;
ROLLBACK;