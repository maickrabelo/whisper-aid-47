CREATE TABLE public.ad_attributions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  source text NOT NULL DEFAULT 'openai',
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  landing_url text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_attributions_email ON public.ad_attributions (email, created_at DESC);

GRANT INSERT ON public.ad_attributions TO anon;
GRANT SELECT, INSERT ON public.ad_attributions TO authenticated;
GRANT ALL ON public.ad_attributions TO service_role;

ALTER TABLE public.ad_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record ad attribution"
ON public.ad_attributions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view ad attributions"
ON public.ad_attributions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));