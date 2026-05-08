ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS tax_status_migrated boolean NOT NULL DEFAULT false;

UPDATE public.clients
SET tax_status_migrated = true
WHERE tax_status = 'cross_border_fr_1983';