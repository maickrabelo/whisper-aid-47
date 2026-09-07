ALTER TABLE public.ltcat_exposures
  ADD COLUMN IF NOT EXISTS exposure_present boolean NOT NULL DEFAULT true;

INSERT INTO public.occupational_agents (internal_code, name, category, description, active)
VALUES
  ('QUIM_GENERICO', 'Agente químico (descrever)', 'CHEMICAL', 'Entrada genérica para descrever manualmente o agente químico avaliado.', true),
  ('QUIM_AUSENCIA_ANEXO_IV', 'Ausência de agentes químicos do Anexo IV', 'CHEMICAL', 'Registro declaratório de ausência de agentes químicos do Anexo IV do Decreto 3.048/1999.', true),
  ('BIO_AUSENCIA_ANEXO_IV', 'Ausência de agentes biológicos do Anexo IV', 'BIOLOGICAL', 'Registro declaratório de ausência de agentes biológicos do Anexo IV do Decreto 3.048/1999.', true)
ON CONFLICT (internal_code) DO NOTHING;