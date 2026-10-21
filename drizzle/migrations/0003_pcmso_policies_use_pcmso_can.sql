DROP POLICY IF EXISTS pcmso_audit_events_insert_actor ON public.pcmso_audit_events;
DROP POLICY IF EXISTS pcmso_audit_events_select_company ON public.pcmso_audit_events;
DROP POLICY IF EXISTS pcmso_programs_delete_company ON public.pcmso_programs;
DROP POLICY IF EXISTS pcmso_programs_insert_company ON public.pcmso_programs;
DROP POLICY IF EXISTS pcmso_programs_select_company ON public.pcmso_programs;
DROP POLICY IF EXISTS pcmso_programs_update_company ON public.pcmso_programs;

CREATE POLICY pcmso_programs_select ON public.pcmso_programs FOR SELECT TO authenticated
  USING (public.pcmso_can(company_id, 'program.view'));
CREATE POLICY pcmso_programs_insert ON public.pcmso_programs FOR INSERT TO authenticated
  WITH CHECK (public.pcmso_can(company_id, 'program.prepare') AND created_by = auth.uid());
CREATE POLICY pcmso_programs_update ON public.pcmso_programs FOR UPDATE TO authenticated
  USING (public.pcmso_can(company_id, 'program.prepare') OR public.pcmso_can(company_id, 'program.approve'))
  WITH CHECK (public.pcmso_can(company_id, 'program.prepare') OR public.pcmso_can(company_id, 'program.approve'));

CREATE POLICY pcmso_audit_events_select ON public.pcmso_audit_events FOR SELECT TO authenticated
  USING (public.pcmso_can(company_id, 'program.view'));
CREATE POLICY pcmso_audit_events_insert ON public.pcmso_audit_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND public.pcmso_can(company_id, 'program.view'));

COMMENT ON TABLE public.pcmso_permissions IS 'DEPRECATED: replaced by public.pcmso_can()';
COMMENT ON FUNCTION public.pcmso_has_permission(uuid, text) IS 'DEPRECATED: use public.pcmso_can()';