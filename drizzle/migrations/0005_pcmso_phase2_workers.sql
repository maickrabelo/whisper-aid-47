CREATE TABLE public.pcmso_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cpf text NOT NULL,
  full_name text NOT NULL,
  registration_number text,
  birth_date date,
  status text NOT NULL DEFAULT 'ativo',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pcmso_workers_cpf_digits CHECK (cpf ~ '^[0-9]{11}$'),
  CONSTRAINT pcmso_workers_status_chk CHECK (status IN ('ativo','desligado')),
  CONSTRAINT pcmso_workers_company_cpf_uniq UNIQUE (company_id, cpf),
  CONSTRAINT pcmso_workers_id_company_uniq UNIQUE (id, company_id)
);

CREATE TABLE public.pcmso_worker_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  company_id uuid NOT NULL,
  event_type text NOT NULL,
  role text,
  sector text,
  ghe_id uuid REFERENCES public.pgr_ghe(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  source text NOT NULL DEFAULT 'manual',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pcmso_worker_history_worker_fk FOREIGN KEY (worker_id, company_id)
    REFERENCES public.pcmso_workers(id, company_id) ON DELETE CASCADE,
  CONSTRAINT pcmso_worker_history_event_chk CHECK (event_type IN ('admissao','mudanca_funcao','desligamento','readmissao'))
);
CREATE INDEX idx_pcmso_worker_history_worker ON public.pcmso_worker_history(worker_id, created_at);

CREATE TABLE public.pcmso_worker_import_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  source_table text NOT NULL DEFAULT 'pgr_ghe_workers',
  source_id uuid NOT NULL,
  worker_id uuid,
  status text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pcmso_worker_import_map_src_uniq UNIQUE (source_table, source_id)
);

GRANT SELECT, INSERT, UPDATE ON public.pcmso_workers TO authenticated;
GRANT SELECT, INSERT ON public.pcmso_worker_history TO authenticated;
GRANT SELECT ON public.pcmso_worker_import_map TO authenticated;
GRANT ALL ON public.pcmso_workers, public.pcmso_worker_history, public.pcmso_worker_import_map TO service_role;

ALTER TABLE public.pcmso_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcmso_worker_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcmso_worker_import_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pcmso workers view" ON public.pcmso_workers FOR SELECT TO authenticated
  USING (public.pcmso_can(company_id, 'program.view'));
CREATE POLICY "pcmso workers insert" ON public.pcmso_workers FOR INSERT TO authenticated
  WITH CHECK (public.pcmso_can(company_id, 'program.prepare'));
CREATE POLICY "pcmso workers update" ON public.pcmso_workers FOR UPDATE TO authenticated
  USING (public.pcmso_can(company_id, 'program.prepare'))
  WITH CHECK (public.pcmso_can(company_id, 'program.prepare'));

CREATE POLICY "pcmso worker history view" ON public.pcmso_worker_history FOR SELECT TO authenticated
  USING (public.pcmso_can(company_id, 'program.view'));
CREATE POLICY "pcmso worker history insert" ON public.pcmso_worker_history FOR INSERT TO authenticated
  WITH CHECK (public.pcmso_can(company_id, 'program.prepare'));

CREATE POLICY "pcmso import map view" ON public.pcmso_worker_import_map FOR SELECT TO authenticated
  USING (public.pcmso_can(company_id, 'program.prepare'));

-- company_id imutável e GHE da mesma empresa
CREATE OR REPLACE FUNCTION public.pcmso_workers_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.company_id <> OLD.company_id THEN
    RAISE EXCEPTION 'Não é permitido mover trabalhador para outra empresa';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_pcmso_workers_guard BEFORE INSERT OR UPDATE ON public.pcmso_workers
  FOR EACH ROW EXECUTE FUNCTION public.pcmso_workers_guard();

CREATE OR REPLACE FUNCTION public.pcmso_worker_history_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ghe_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pgr_ghe g JOIN public.pgr_documents d ON d.id = g.pgr_document_id
    WHERE g.id = NEW.ghe_id AND d.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'GHE pertence a outra empresa';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_pcmso_worker_history_guard BEFORE INSERT ON public.pcmso_worker_history
  FOR EACH ROW EXECUTE FUNCTION public.pcmso_worker_history_guard();

CREATE TRIGGER trg_pcmso_workers_audit AFTER INSERT OR UPDATE ON public.pcmso_workers
  FOR EACH ROW EXECUTE FUNCTION public.pcmso_audit_trigger();
CREATE TRIGGER trg_pcmso_worker_history_audit AFTER INSERT ON public.pcmso_worker_history
  FOR EACH ROW EXECUTE FUNCTION public.pcmso_audit_trigger();

-- Importação idempotente dos trabalhadores dos GHEs do PGR
CREATE OR REPLACE FUNCTION public.pcmso_import_pgr_workers(_company_id uuid, _dry_run boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  _cpf text;
  _wid uuid;
  _new int := 0; _matched int := 0; _invalid int := 0; _already int := 0; _dup int := 0;
  _seen text[] := '{}';
BEGIN
  IF NOT public.pcmso_can(_company_id, 'program.prepare') THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;

  FOR r IN
    SELECT w.*, g.id AS gid, g.sector AS gsector, g.role AS grole
    FROM public.pgr_ghe_workers w
    JOIN public.pgr_ghe g ON g.id = w.ghe_id
    JOIN public.pgr_documents d ON d.id = g.pgr_document_id
    WHERE d.company_id = _company_id
    ORDER BY w.created_at
  LOOP
    IF EXISTS (SELECT 1 FROM public.pcmso_worker_import_map m WHERE m.source_table='pgr_ghe_workers' AND m.source_id = r.id) THEN
      _already := _already + 1; CONTINUE;
    END IF;

    _cpf := regexp_replace(coalesce(r.cpf,''), '\D', '', 'g');
    IF length(_cpf) <> 11 OR _cpf ~ '^(\d)\1{10}$' THEN
      _invalid := _invalid + 1;
      IF NOT _dry_run THEN
        INSERT INTO public.pcmso_worker_import_map(company_id, source_id, status, reason)
        VALUES (_company_id, r.id, 'rejeitado', 'CPF inválido');
      END IF;
      CONTINUE;
    END IF;

    SELECT id INTO _wid FROM public.pcmso_workers WHERE company_id = _company_id AND cpf = _cpf;
    IF _wid IS NOT NULL OR _cpf = ANY(_seen) THEN
      IF _cpf = ANY(_seen) THEN _dup := _dup + 1; ELSE _matched := _matched + 1; END IF;
      IF NOT _dry_run THEN
        IF _wid IS NULL THEN
          SELECT id INTO _wid FROM public.pcmso_workers WHERE company_id = _company_id AND cpf = _cpf;
        END IF;
        INSERT INTO public.pcmso_worker_import_map(company_id, source_id, worker_id, status, reason)
        VALUES (_company_id, r.id, _wid, 'vinculado', 'CPF já cadastrado');
        IF NOT EXISTS (SELECT 1 FROM public.pcmso_worker_history h WHERE h.worker_id=_wid AND h.ghe_id = r.gid) THEN
          INSERT INTO public.pcmso_worker_history(worker_id, company_id, event_type, role, sector, ghe_id, start_date, source, created_by)
          VALUES (_wid, _company_id, 'mudanca_funcao', r.grole, r.gsector, r.gid, r.admission_date, 'pgr_import', auth.uid());
        END IF;
      END IF;
      _seen := _seen || _cpf;
      CONTINUE;
    END IF;

    _new := _new + 1;
    _seen := _seen || _cpf;
    IF NOT _dry_run THEN
      INSERT INTO public.pcmso_workers(company_id, cpf, full_name, registration_number, created_by)
      VALUES (_company_id, _cpf, trim(r.full_name), nullif(trim(coalesce(r.registration_number,'')),''), auth.uid())
      RETURNING id INTO _wid;
      INSERT INTO public.pcmso_worker_history(worker_id, company_id, event_type, role, sector, ghe_id, start_date, source, created_by)
      VALUES (_wid, _company_id, 'admissao', r.grole, r.gsector, r.gid, r.admission_date, 'pgr_import', auth.uid());
      INSERT INTO public.pcmso_worker_import_map(company_id, source_id, worker_id, status)
      VALUES (_company_id, r.id, _wid, 'criado');
    END IF;
  END LOOP;

  RETURN jsonb_build_object('novos', _new, 'ja_cadastrados', _matched, 'duplicados_no_pgr', _dup,
    'cpf_invalido', _invalid, 'ja_importados', _already, 'simulacao', _dry_run);
END $$;
GRANT EXECUTE ON FUNCTION public.pcmso_import_pgr_workers(uuid, boolean) TO authenticated;

-- Evento de vida funcional (mudança de função, desligamento, readmissão)
CREATE OR REPLACE FUNCTION public.pcmso_worker_event(_worker_id uuid, _event text, _date date, _role text DEFAULT NULL, _sector text DEFAULT NULL, _ghe_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _company uuid; _status text; _hid uuid;
BEGIN
  SELECT company_id, status INTO _company, _status FROM public.pcmso_workers WHERE id = _worker_id;
  IF _company IS NULL OR NOT public.pcmso_can(_company, 'program.prepare') THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = '42501';
  END IF;
  IF _event NOT IN ('mudanca_funcao','desligamento','readmissao') THEN RAISE EXCEPTION 'Evento inválido'; END IF;
  IF _event = 'desligamento' AND _status = 'desligado' THEN RAISE EXCEPTION 'Trabalhador já desligado'; END IF;
  IF _event = 'readmissao' AND _status = 'ativo' THEN RAISE EXCEPTION 'Trabalhador já está ativo'; END IF;
  IF _event = 'mudanca_funcao' AND _status = 'desligado' THEN RAISE EXCEPTION 'Trabalhador desligado'; END IF;

  UPDATE public.pcmso_worker_history SET end_date = coalesce(_date, current_date)
   WHERE worker_id = _worker_id AND end_date IS NULL AND event_type <> 'desligamento';

  INSERT INTO public.pcmso_worker_history(worker_id, company_id, event_type, role, sector, ghe_id, start_date, created_by)
  VALUES (_worker_id, _company, _event, _role, _sector, _ghe_id, coalesce(_date, current_date), auth.uid())
  RETURNING id INTO _hid;

  UPDATE public.pcmso_workers SET status = CASE WHEN _event='desligamento' THEN 'desligado' ELSE 'ativo' END
   WHERE id = _worker_id;
  RETURN _hid;
END $$;
GRANT EXECUTE ON FUNCTION public.pcmso_worker_event(uuid, text, date, text, text, uuid) TO authenticated;