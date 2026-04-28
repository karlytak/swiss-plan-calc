-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE public.civil_status AS ENUM (
  'single', 'married', 'registered_partnership', 'divorced', 'widowed', 'separated'
);

CREATE TYPE public.confession AS ENUM (
  'none', 'roman_catholic', 'protestant', 'christian_catholic', 'jewish', 'other'
);

CREATE TYPE public.tax_status AS ENUM (
  'ordinary_resident',     -- résident imposé au rôle ordinaire
  'source_taxed',          -- imposé à la source (permis B/L/Ci/F)
  'cross_border_g',        -- frontalier permis G
  'quasi_resident',        -- quasi-résident (TOU possible)
  'non_taxable'            -- non assujetti
);

CREATE TYPE public.permit_type AS ENUM (
  'none', 'B', 'C', 'L', 'Ci', 'F', 'G', 'swiss'
);

CREATE TYPE public.work_status AS ENUM (
  'employee', 'self_employed', 'mixed', 'retired', 'unemployed', 'student'
);

CREATE TYPE public.lpp_plan_type AS ENUM (
  'mandatory', 'extra_mandatory', 'executive', 'mixed'
);

CREATE TYPE public.broker_plan AS ENUM ('free', 'pro', 'enterprise');

CREATE TYPE public.scenario_kind AS ENUM (
  'baseline', 'marriage', 'divorce', 'child_birth', 'move_canton',
  'activity_change', 'become_self_employed', 'real_estate_purchase',
  'lpp_buyback', 'pillar_3a_strategy', 'retirement', 'other'
);

-- =========================================================
-- PROFILES (broker)
-- =========================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  brokerage_name TEXT,
  phone TEXT,
  logo_url TEXT,
  plan public.broker_plan NOT NULL DEFAULT 'free',
  default_canton CHAR(2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Brokers update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Brokers insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- CLIENTS (dossiers)
-- =========================================================
CREATE TABLE public.clients (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Identity
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  civil_status public.civil_status NOT NULL DEFAULT 'single',
  confession public.confession NOT NULL DEFAULT 'none',
  nationality TEXT,
  permit public.permit_type NOT NULL DEFAULT 'swiss',
  -- Tax status
  tax_status public.tax_status NOT NULL DEFAULT 'ordinary_resident',
  source_tax_scale CHAR(1),  -- A/B/C/H/F/L
  -- Domicile (Switzerland)
  canton CHAR(2),            -- ZH, BE, GE, ...
  commune TEXT,
  postal_code TEXT,
  parish TEXT,
  -- Cross-border specifics
  country_of_residence TEXT, -- e.g. FR, IT, DE for cross-border workers
  -- Profession
  work_status public.work_status NOT NULL DEFAULT 'employee',
  activity_rate NUMERIC(5,2) DEFAULT 100.0, -- 0..100
  employer TEXT,
  gross_annual_salary NUMERIC(12,2),
  bonus NUMERIC(12,2),
  other_income NUMERIC(12,2),
  -- Spouse (optional, simplified)
  spouse_first_name TEXT,
  spouse_last_name TEXT,
  spouse_date_of_birth DATE,
  spouse_gross_annual_salary NUMERIC(12,2),
  -- Children (compact JSON: [{first_name,date_of_birth}])
  children JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Misc
  email TEXT,
  phone TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_broker ON public.clients(broker_id);
CREATE INDEX idx_clients_canton ON public.clients(canton);
CREATE INDEX idx_clients_name ON public.clients(last_name, first_name);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view their own clients"
  ON public.clients FOR SELECT
  USING (auth.uid() = broker_id);
CREATE POLICY "Brokers create their own clients"
  ON public.clients FOR INSERT
  WITH CHECK (auth.uid() = broker_id);
CREATE POLICY "Brokers update their own clients"
  ON public.clients FOR UPDATE
  USING (auth.uid() = broker_id);
CREATE POLICY "Brokers delete their own clients"
  ON public.clients FOR DELETE
  USING (auth.uid() = broker_id);

CREATE TRIGGER trg_clients_updated
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- CLIENT ASSETS (patrimoine)
-- =========================================================
CREATE TABLE public.client_assets (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_accounts NUMERIC(14,2) NOT NULL DEFAULT 0,
  securities NUMERIC(14,2) NOT NULL DEFAULT 0,
  real_estate_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  real_estate_rental_value NUMERIC(12,2) NOT NULL DEFAULT 0, -- valeur locative
  real_estate_maintenance NUMERIC(12,2) NOT NULL DEFAULT 0,
  vehicles NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_assets NUMERIC(14,2) NOT NULL DEFAULT 0,
  mortgage_debt NUMERIC(14,2) NOT NULL DEFAULT 0,
  mortgage_interest NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_debts NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_assets_client ON public.client_assets(client_id);

ALTER TABLE public.client_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view their own client assets"
  ON public.client_assets FOR SELECT
  USING (auth.uid() = broker_id);
CREATE POLICY "Brokers manage their own client assets"
  ON public.client_assets FOR ALL
  USING (auth.uid() = broker_id)
  WITH CHECK (auth.uid() = broker_id);

CREATE TRIGGER trg_client_assets_updated
  BEFORE UPDATE ON public.client_assets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- CLIENT PENSION (prévoyance)
-- =========================================================
CREATE TABLE public.client_pension (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- LPP / 2nd pillar
  lpp_current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  lpp_insured_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  lpp_coordination_deduction NUMERIC(12,2) NOT NULL DEFAULT 0,
  lpp_plan public.lpp_plan_type NOT NULL DEFAULT 'mandatory',
  lpp_conversion_rate NUMERIC(5,3),  -- e.g. 6.800 for 6.80%
  lpp_max_buyback NUMERIC(12,2) NOT NULL DEFAULT 0, -- lacune de prévoyance
  lpp_buybacks_done JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{year,amount}]
  lpp_early_withdrawals JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{year,amount,reason}]
  -- Free passage
  vested_benefits_accounts JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{institution,balance,strategy}]
  -- 3a
  pillar_3a_accounts JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{institution,balance,annual_contribution}]
  pillar_3a_annual_contribution NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- 3b
  pillar_3b_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Spouse pension (compact)
  spouse_lpp_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  spouse_pillar_3a_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_pension_client ON public.client_pension(client_id);

ALTER TABLE public.client_pension ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view their own client pension"
  ON public.client_pension FOR SELECT
  USING (auth.uid() = broker_id);
CREATE POLICY "Brokers manage their own client pension"
  ON public.client_pension FOR ALL
  USING (auth.uid() = broker_id)
  WITH CHECK (auth.uid() = broker_id);

CREATE TRIGGER trg_client_pension_updated
  BEFORE UPDATE ON public.client_pension
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- SCENARIOS
-- =========================================================
CREATE TABLE public.scenarios (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind public.scenario_kind NOT NULL DEFAULT 'baseline',
  description TEXT,
  -- All overrides for the scenario (changes vs baseline)
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scenarios_client ON public.scenarios(client_id);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view their own scenarios"
  ON public.scenarios FOR SELECT
  USING (auth.uid() = broker_id);
CREATE POLICY "Brokers manage their own scenarios"
  ON public.scenarios FOR ALL
  USING (auth.uid() = broker_id)
  WITH CHECK (auth.uid() = broker_id);

CREATE TRIGGER trg_scenarios_updated
  BEFORE UPDATE ON public.scenarios
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- SIMULATIONS (results snapshot)
-- =========================================================
CREATE TABLE public.simulations (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  -- Full computed result (taxes, pension projections, optimization suggestions)
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_simulations_scenario ON public.simulations(scenario_id);
CREATE INDEX idx_simulations_client ON public.simulations(client_id);

ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view their own simulations"
  ON public.simulations FOR SELECT
  USING (auth.uid() = broker_id);
CREATE POLICY "Brokers manage their own simulations"
  ON public.simulations FOR ALL
  USING (auth.uid() = broker_id)
  WITH CHECK (auth.uid() = broker_id);

-- =========================================================
-- CLIENT NOTES
-- =========================================================
CREATE TABLE public.client_notes (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  broker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_notes_client ON public.client_notes(client_id);

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brokers view their own notes"
  ON public.client_notes FOR SELECT
  USING (auth.uid() = broker_id);
CREATE POLICY "Brokers manage their own notes"
  ON public.client_notes FOR ALL
  USING (auth.uid() = broker_id)
  WITH CHECK (auth.uid() = broker_id);

-- =========================================================
-- TAX YEAR DATA (barèmes versionnés)
-- =========================================================
-- Stores all tax brackets, multipliers, LPP/3a parameters as versioned JSON
-- so simulations are reproducible year-over-year.
CREATE TABLE public.tax_year_data (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year INTEGER NOT NULL,
  canton CHAR(2),  -- NULL = federal/global (IFD, plafonds 3a, paramètres LPP)
  data_kind TEXT NOT NULL, -- 'ifd', 'icc', 'wealth', 'source', 'capital_benefit', 'communal', 'lpp', 'pillar_3a', 'church'
  payload JSONB NOT NULL,
  source TEXT, -- e.g. 'AFC 2025', 'Etat de Genève'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tax_year, canton, data_kind)
);

CREATE INDEX idx_tax_year_data_lookup ON public.tax_year_data(tax_year, canton, data_kind);

ALTER TABLE public.tax_year_data ENABLE ROW LEVEL SECURITY;

-- All authenticated brokers can read tax data
CREATE POLICY "Authenticated users can read tax data"
  ON public.tax_year_data FOR SELECT
  TO authenticated
  USING (true);

-- Writes are admin-only (no user can write via API; managed by admin tools / migrations)
-- (No INSERT/UPDATE/DELETE policies = no access for regular users)