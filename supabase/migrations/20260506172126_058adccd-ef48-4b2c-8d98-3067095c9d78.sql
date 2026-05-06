-- Create gender enum and add column to clients
DO $$ BEGIN
  CREATE TYPE public.gender AS ENUM ('male', 'female', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS gender public.gender;