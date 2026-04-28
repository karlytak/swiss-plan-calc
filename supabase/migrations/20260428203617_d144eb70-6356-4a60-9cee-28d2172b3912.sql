-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.simulation_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id UUID NOT NULL,
  simulation_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_views INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0,
  revoked BOOLEAN NOT NULL DEFAULT false,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_simulation_shares_token ON public.simulation_shares(token);
CREATE INDEX idx_simulation_shares_broker ON public.simulation_shares(broker_id);
CREATE INDEX idx_simulation_shares_simulation ON public.simulation_shares(simulation_id);

ALTER TABLE public.simulation_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view own shares"
  ON public.simulation_shares FOR SELECT
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers create own shares"
  ON public.simulation_shares FOR INSERT
  WITH CHECK (auth.uid() = broker_id);

CREATE POLICY "Brokers update own shares"
  ON public.simulation_shares FOR UPDATE
  USING (auth.uid() = broker_id);

CREATE POLICY "Brokers delete own shares"
  ON public.simulation_shares FOR DELETE
  USING (auth.uid() = broker_id);

CREATE TRIGGER touch_simulation_shares_updated_at
  BEFORE UPDATE ON public.simulation_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- Public access by token (with optional password)
CREATE OR REPLACE FUNCTION public.access_shared_simulation(
  _token TEXT,
  _password TEXT DEFAULT NULL
)
RETURNS TABLE (
  kind TEXT,
  title TEXT,
  note TEXT,
  inputs JSONB,
  summary JSONB,
  tags TEXT[],
  simulation_created_at TIMESTAMP WITH TIME ZONE,
  shared_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  remaining_views INTEGER,
  broker_display TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  _share public.simulation_shares%ROWTYPE;
  _sim public.simulation_history%ROWTYPE;
  _profile public.profiles%ROWTYPE;
  _provided_hash TEXT;
BEGIN
  SELECT * INTO _share FROM public.simulation_shares WHERE token = _token;
  IF NOT FOUND THEN RAISE EXCEPTION 'SHARE_NOT_FOUND'; END IF;
  IF _share.revoked THEN RAISE EXCEPTION 'SHARE_REVOKED'; END IF;
  IF _share.expires_at IS NOT NULL AND _share.expires_at < now() THEN
    RAISE EXCEPTION 'SHARE_EXPIRED';
  END IF;
  IF _share.max_views IS NOT NULL AND _share.view_count >= _share.max_views THEN
    RAISE EXCEPTION 'SHARE_MAX_VIEWS';
  END IF;
  IF _share.password_hash IS NOT NULL THEN
    IF _password IS NULL OR _password = '' THEN
      RAISE EXCEPTION 'SHARE_PASSWORD_REQUIRED';
    END IF;
    _provided_hash := encode(extensions.digest(_password || _share.id::text, 'sha256'), 'hex');
    IF _provided_hash <> _share.password_hash THEN
      RAISE EXCEPTION 'SHARE_PASSWORD_INVALID';
    END IF;
  END IF;

  SELECT * INTO _sim FROM public.simulation_history WHERE id = _share.simulation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'SHARE_NOT_FOUND'; END IF;

  SELECT * INTO _profile FROM public.profiles WHERE id = _share.broker_id;

  UPDATE public.simulation_shares
  SET view_count = view_count + 1, last_viewed_at = now()
  WHERE id = _share.id;

  RETURN QUERY SELECT
    _sim.kind::TEXT,
    _sim.title,
    _sim.note,
    _sim.inputs,
    _sim.summary,
    _sim.tags,
    _sim.created_at,
    _share.created_at,
    _share.expires_at,
    CASE WHEN _share.max_views IS NULL THEN NULL ELSE (_share.max_views - _share.view_count - 1) END,
    COALESCE(NULLIF(TRIM(CONCAT(_profile.first_name, ' ', _profile.last_name)), ''), _profile.brokerage_name, _profile.email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.access_shared_simulation(TEXT, TEXT) TO anon, authenticated;

-- Helper to hash a password (called by authenticated brokers when creating a share)
CREATE OR REPLACE FUNCTION public.hash_share_password(_share_id UUID, _password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  RETURN encode(extensions.digest(_password || _share_id::text, 'sha256'), 'hex');
END;
$$;

GRANT EXECUTE ON FUNCTION public.hash_share_password(UUID, TEXT) TO authenticated;