CREATE TABLE public.pcmso_exam_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id),
 worker_id uuid NOT NULL, program_id uuid NOT NULL REFERENCES public.pcmso_programs(id), protocol_id uuid NOT NULL REFERENCES public.pcmso_protocols(id),
 request_key uuid NOT NULL, simulation boolean NOT NULL DEFAULT true CHECK(simulation),
 worker_snapshot jsonb NOT NULL, protocol_snapshot jsonb NOT NULL,
 due_date date NOT NULL, scheduled_date date, location text NOT NULL DEFAULT '' CHECK(length(location)<=300),
 status text NOT NULL DEFAULT 'solicitado' CHECK(status IN ('solicitado','agendado','compareceu','cancelado')),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(worker_id,company_id) REFERENCES public.pcmso_workers(id,company_id), UNIQUE(company_id,request_key),
 CHECK(status<>'agendado' OR scheduled_date IS NOT NULL)
);
GRANT SELECT ON public.pcmso_exam_orders TO authenticated;
GRANT ALL ON public.pcmso_exam_orders TO service_role;
ALTER TABLE public.pcmso_exam_orders ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.pcmso_exam_order_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), order_id uuid NOT NULL REFERENCES public.pcmso_exam_orders(id),
 content jsonb NOT NULL, reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 1000), actor_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pcmso_exam_order_history TO authenticated;
GRANT ALL ON public.pcmso_exam_order_history TO service_role;
ALTER TABLE public.pcmso_exam_order_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX ON public.pcmso_exam_orders(company_id,due_date);
CREATE INDEX ON public.pcmso_exam_order_history(order_id,recorded_at);
CREATE OR REPLACE FUNCTION public.pcmso_exam_can(_company_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.pcmso_can(_company_id,'program.view') AND public.has_feature_access('PCMSO_EXAMS_BETA',_company_id);
$$;
REVOKE ALL ON FUNCTION public.pcmso_exam_can(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pcmso_exam_can(uuid) TO authenticated;
CREATE POLICY exam_orders_read ON public.pcmso_exam_orders FOR SELECT TO authenticated USING(public.pcmso_exam_can(company_id));
CREATE POLICY exam_order_history_read ON public.pcmso_exam_order_history FOR SELECT TO authenticated USING(public.pcmso_exam_can(company_id));
CREATE OR REPLACE FUNCTION public.pcmso_request_exam(_company_id uuid,_worker_id uuid,_protocol_id uuid,_due_date date,_request_key uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.pcmso_workers; p public.pcmso_protocols; existing public.pcmso_exam_orders; history_data jsonb; oid uuid; state text;
BEGIN
 IF NOT public.pcmso_exam_can(_company_id) THEN RAISE EXCEPTION 'Convocações não liberadas para esta empresa' USING ERRCODE='42501'; END IF;
 IF _due_date IS NULL OR _request_key IS NULL THEN RAISE EXCEPTION 'Informe prazo e identificação do pedido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_company_id::text||_request_key::text,0));
 SELECT * INTO existing FROM public.pcmso_exam_orders WHERE company_id=_company_id AND request_key=_request_key;
 IF existing.id IS NOT NULL THEN
  IF existing.worker_id<>_worker_id OR existing.protocol_id<>_protocol_id OR existing.due_date<>_due_date THEN RAISE EXCEPTION 'Identificação já usada em outro pedido'; END IF;
  RETURN existing.id;
 END IF;
 SELECT * INTO w FROM public.pcmso_workers WHERE id=_worker_id AND company_id=_company_id FOR SHARE;
 IF w.id IS NULL THEN RAISE EXCEPTION 'Trabalhador de outra empresa' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.pcmso_protocols WHERE id=_protocol_id AND company_id=_company_id FOR SHARE;
 IF p.id IS NULL THEN RAISE EXCEPTION 'Protocolo de outra empresa' USING ERRCODE='42501'; END IF;
 SELECT status INTO state FROM public.pcmso_programs WHERE id=p.program_id AND company_id=_company_id FOR SHARE;
 IF state NOT IN ('rascunho','aprovado') OR NOT p.active THEN RAISE EXCEPTION 'Escolha protocolo ativo de rascunho ou programa aprovado'; END IF;
 IF w.status<>'ativo' AND p.exam_type<>'demissional' THEN RAISE EXCEPTION 'Trabalhador desligado: somente pedido demissional'; END IF;
 IF p.scope='ghe' AND NOT EXISTS(SELECT 1 FROM public.pcmso_worker_history WHERE worker_id=w.id AND company_id=_company_id AND ghe_id=p.ghe_id AND end_date IS NULL AND event_type<>'desligamento') THEN RAISE EXCEPTION 'Trabalhador fora do GHE do protocolo'; END IF;
 SELECT jsonb_build_object('role',role,'sector',sector,'ghe_id',ghe_id,'employment_event_id',id) INTO history_data FROM public.pcmso_worker_history WHERE worker_id=w.id AND company_id=_company_id ORDER BY created_at DESC,id DESC LIMIT 1;
 INSERT INTO public.pcmso_exam_orders(company_id,worker_id,program_id,protocol_id,request_key,worker_snapshot,protocol_snapshot,due_date,created_by)
 VALUES(_company_id,w.id,p.program_id,p.id,_request_key,jsonb_build_object('name',w.full_name,'registration_number',w.registration_number,'employment',history_data),to_jsonb(p)-'notes'-'justification',_due_date,auth.uid()) RETURNING id INTO oid;
 INSERT INTO public.pcmso_exam_order_history(company_id,order_id,content,reason,actor_id) SELECT company_id,id,to_jsonb(o),'Solicitação de teste criada',auth.uid() FROM public.pcmso_exam_orders o WHERE id=oid;
 RETURN oid;
END; $$;
REVOKE ALL ON FUNCTION public.pcmso_request_exam(uuid,uuid,uuid,date,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pcmso_request_exam(uuid,uuid,uuid,date,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.pcmso_update_exam_order(_order_id uuid,_status text,_scheduled_date date,_location text,_reason text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.pcmso_exam_orders;
BEGIN
 SELECT * INTO o FROM public.pcmso_exam_orders WHERE id=_order_id FOR UPDATE;
 IF o.id IS NULL OR NOT public.pcmso_exam_can(o.company_id) THEN RAISE EXCEPTION 'Sem autorização para este pedido' USING ERRCODE='42501'; END IF;
 IF _status IS NULL OR _status NOT IN ('agendado','compareceu','cancelado') OR length(trim(coalesce(_reason,''))) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'Informe situação e motivo da alteração'; END IF;
 IF length(coalesce(_location,''))>300 THEN RAISE EXCEPTION 'Local muito longo'; END IF;
 IF _status='agendado' AND _scheduled_date IS NULL THEN RAISE EXCEPTION 'Informe a data do agendamento'; END IF;
 IF _status='compareceu' AND o.status NOT IN ('agendado','compareceu') THEN RAISE EXCEPTION 'Registre o agendamento antes do comparecimento'; END IF;
 IF o.status IN ('cancelado','compareceu') THEN
  IF _status=o.status THEN RETURN o.id; END IF;
  RAISE EXCEPTION 'Pedido encerrado não pode ser reaberto';
 END IF;
 IF o.status=_status AND o.scheduled_date IS NOT DISTINCT FROM _scheduled_date AND o.location=coalesce(_location,'') THEN RETURN o.id; END IF;
 UPDATE public.pcmso_exam_orders SET status=_status,scheduled_date=CASE WHEN _status='agendado' THEN _scheduled_date ELSE scheduled_date END,location=coalesce(_location,''),updated_at=now() WHERE id=o.id;
 INSERT INTO public.pcmso_exam_order_history(company_id,order_id,content,reason,actor_id) SELECT company_id,id,to_jsonb(e),trim(_reason),auth.uid() FROM public.pcmso_exam_orders e WHERE id=o.id;
 RETURN o.id;
END; $$;
REVOKE ALL ON FUNCTION public.pcmso_update_exam_order(uuid,text,date,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pcmso_update_exam_order(uuid,text,date,text,text) TO authenticated;
CREATE TRIGGER exam_orders_audit AFTER INSERT OR UPDATE ON public.pcmso_exam_orders FOR EACH ROW EXECUTE FUNCTION public.pcmso_audit_trigger();
COMMENT ON TABLE public.pcmso_exam_orders IS 'Phase 6 simulation only until Release A signature and physician acceptance. No clinical results, fitness decisions or external delivery. Writes only via authorized RPCs.';
COMMENT ON TABLE public.pcmso_exam_order_history IS 'Append-only operational history; worker/protocol snapshots preserved after changes. No authenticated write/delete privileges.';