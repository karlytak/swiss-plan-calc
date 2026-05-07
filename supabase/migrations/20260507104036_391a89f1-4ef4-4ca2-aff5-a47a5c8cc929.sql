ALTER TYPE public.work_status ADD VALUE IF NOT EXISTS 'director';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_role text;