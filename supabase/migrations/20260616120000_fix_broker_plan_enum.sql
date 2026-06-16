-- Correction de l'enum broker_plan pour correspondre aux vrais plans
ALTER TYPE public.broker_plan ADD VALUE IF NOT EXISTS 'trial';
ALTER TYPE public.broker_plan ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE public.broker_plan ADD VALUE IF NOT EXISTS 'cabinet';
ALTER TYPE public.broker_plan ADD VALUE IF NOT EXISTS 'expired';

-- Valeur par défaut à l'inscription = trial
ALTER TABLE public.profiles ALTER COLUMN plan SET DEFAULT 'trial';
