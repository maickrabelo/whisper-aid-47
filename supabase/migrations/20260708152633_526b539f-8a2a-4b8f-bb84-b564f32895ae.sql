
ALTER TABLE public.pgr_risks
  ADD COLUMN IF NOT EXISTS exposed_workers integer,
  ADD COLUMN IF NOT EXISTS magnitude smallint NOT NULL DEFAULT 1
    CHECK (magnitude BETWEEN 1 AND 5);

CREATE OR REPLACE FUNCTION public.pgr_risks_compute_level()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v INTEGER;
  prob_adj INTEGER;
  bump INTEGER;
BEGIN
  IF NEW.severity > NEW.matrix_size THEN NEW.severity := NEW.matrix_size; END IF;
  IF NEW.probability > NEW.matrix_size THEN NEW.probability := NEW.matrix_size; END IF;
  IF NEW.severity < 1 THEN NEW.severity := 1; END IF;
  IF NEW.probability < 1 THEN NEW.probability := 1; END IF;
  IF NEW.magnitude IS NULL OR NEW.magnitude < 1 THEN NEW.magnitude := 1; END IF;
  IF NEW.magnitude > 5 THEN NEW.magnitude := 5; END IF;

  -- NR-1 1.5.5.2.1.1: número de trabalhadores atingidos eleva a probabilidade
  bump := CASE NEW.magnitude WHEN 5 THEN 2 WHEN 4 THEN 1 ELSE 0 END;
  prob_adj := LEAST(NEW.probability + bump, NEW.matrix_size);

  v := NEW.severity * prob_adj;

  IF NEW.matrix_size = 3 THEN
    NEW.risk_level := CASE
      WHEN v >= 9 THEN 'intolerable'
      WHEN v >= 6 THEN 'substantial'
      WHEN v >= 3 THEN 'moderate'
      WHEN v >= 2 THEN 'tolerable'
      ELSE 'trivial'
    END;
  ELSIF NEW.matrix_size = 4 THEN
    NEW.risk_level := CASE
      WHEN v >= 15 THEN 'intolerable'
      WHEN v >= 9 THEN 'substantial'
      WHEN v >= 5 THEN 'moderate'
      WHEN v >= 3 THEN 'tolerable'
      ELSE 'trivial'
    END;
  ELSE
    NEW.risk_level := CASE
      WHEN v >= 20 THEN 'intolerable'
      WHEN v >= 15 THEN 'substantial'
      WHEN v >= 8 THEN 'moderate'
      WHEN v >= 4 THEN 'tolerable'
      ELSE 'trivial'
    END;
  END IF;

  RETURN NEW;
END;
$function$;
