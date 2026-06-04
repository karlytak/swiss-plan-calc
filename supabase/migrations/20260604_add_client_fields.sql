-- Ajout des nouveaux champs fiche client v2
-- 1. Lieu de travail du conjoint
-- 2. Secteur d'activité / Métier client
-- 3. Intérêts hypothécaires résidence France
-- 4. Salaire fictif conjoint (mode provisoire/réel)

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS spouse_work_location TEXT CHECK (spouse_work_location IN ('switzerland', 'france', 'none')) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS activity_sector TEXT,
  ADD COLUMN IF NOT EXISTS mortgage_interest_france NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spouse_salary_is_fictif BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.clients.spouse_work_location IS 'Lieu de travail du conjoint : switzerland / france / none';
COMMENT ON COLUMN public.clients.activity_sector IS 'Secteur d activité ou métier du client (informatif)';
COMMENT ON COLUMN public.clients.mortgage_interest_france IS 'Intérêts hypothécaires résidence principale France en CHF - déductible accord 1983';
COMMENT ON COLUMN public.clients.spouse_salary_is_fictif IS 'true = salaire conjoint fictif provisoire (min(salaire_client, 70500)), false = salaire réel renseigné';
