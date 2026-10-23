REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.pcmso_exam_orders,public.pcmso_exam_order_history FROM anon,authenticated;
REVOKE SELECT ON public.pcmso_exam_orders,public.pcmso_exam_order_history FROM anon;
GRANT SELECT ON public.pcmso_exam_orders,public.pcmso_exam_order_history TO authenticated;
COMMENT ON TABLE public.pcmso_exam_order_history IS 'Append-only operational history; explicitly revoke inherited/default authenticated writes. RPC-only modifications.';