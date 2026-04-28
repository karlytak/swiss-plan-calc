-- Enum for simulation kinds
DO $$ BEGIN
  CREATE TYPE public.simulation_kind AS ENUM (
    'income_tax',
    'source_tax',
    'lpp',
    'pillar3a',
    'retirement',
    'canton_compare'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.simulation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL,
  client_id UUID NULL,
  kind public.simulation_kind NOT NULL,
  title TEXT NOT NULL,
  note TEXT NULL,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.simulation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view own simulation history"
  ON public.simulation_history FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers insert own simulation history"
  ON public.simulation_history FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers update own simulation history"
  ON public.simulation_history FOR UPDATE
  USING (auth.uid() = broker_id)
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers delete own simulation history"
  ON public.simulation_history FOR DELETE
  USING (auth.uid() = broker_id);

CREATE INDEX IF NOT EXISTS idx_sim_history_broker_created
  ON public.simulation_history(broker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sim_history_kind
  ON public.simulation_history(broker_id, kind);

CREATE INDEX IF NOT EXISTS idx_sim_history_client
  ON public.simulation_history(client_id);

CREATE TRIGGER trg_sim_history_touch
  BEFORE UPDATE ON public.simulation_history
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();