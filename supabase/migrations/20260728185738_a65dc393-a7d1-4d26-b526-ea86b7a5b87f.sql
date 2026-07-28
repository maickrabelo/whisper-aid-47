CREATE TABLE public.subscription_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  executed_by uuid REFERENCES auth.users(id),
  executed_by_email text,
  total_rows integer NOT NULL DEFAULT 0,
  total_emails integer NOT NULL DEFAULT 0,
  count_activated integer NOT NULL DEFAULT 0,
  count_renewed integer NOT NULL DEFAULT 0,
  count_trial integer NOT NULL DEFAULT 0,
  count_blocked integer NOT NULL DEFAULT 0,
  count_no_account integer NOT NULL DEFAULT 0,
  count_divergent integer NOT NULL DEFAULT 0,
  count_unchanged integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'applied',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subscription_reconciliation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id uuid NOT NULL REFERENCES public.subscription_reconciliations(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid,
  action text NOT NULL,
  reason text,
  purchase_amount_cents integer,
  payment_confirmed_at timestamptz,
  previous_plan text,
  new_plan text,
  previous_status text,
  new_status text,
  previous_period_end timestamptz,
  new_period_end timestamptz,
  applied boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recon_items_recon_id ON public.subscription_reconciliation_items(reconciliation_id);
CREATE INDEX idx_recon_items_email ON public.subscription_reconciliation_items(email);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_reconciliations TO authenticated;
GRANT ALL ON public.subscription_reconciliations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_reconciliation_items TO authenticated;
GRANT ALL ON public.subscription_reconciliation_items TO service_role;

ALTER TABLE public.subscription_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_reconciliation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reconciliations"
ON public.subscription_reconciliations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage reconciliation items"
ON public.subscription_reconciliation_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_subscription_reconciliations_updated_at
BEFORE UPDATE ON public.subscription_reconciliations
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();