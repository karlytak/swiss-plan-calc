ALTER TABLE public.client_pension
  ADD COLUMN IF NOT EXISTS lpp_planned_buybacks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lpp_assumptions jsonb;