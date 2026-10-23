REVOKE DELETE ON public.pcmso_protocols FROM authenticated,anon;
REVOKE INSERT,UPDATE,DELETE ON public.pcmso_program_versions FROM authenticated,anon;
REVOKE INSERT,UPDATE,DELETE ON public.pcmso_protocol_history FROM authenticated,anon;
REVOKE UPDATE,DELETE ON public.pcmso_exam_catalog FROM authenticated,anon;