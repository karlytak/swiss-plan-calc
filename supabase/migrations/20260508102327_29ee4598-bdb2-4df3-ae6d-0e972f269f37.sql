-- Recréation propre de l'enum tax_status avec 5 valeurs cibles uniquement.
-- Mapping appliqué via USING au moment du changement de type :
--   ordinary_resident   → resident
--   non_taxable         → resident (avec rappel à reconfirmer manuellement)
--   cross_border_g      → cross_border_fr_1983 (cas le plus fréquent SR)
--   quasi_resident      → tou
--   source_taxed        → source_taxed
--   cross_border_fr_1983, cross_border_ge, tou → inchangés

CREATE TYPE public.tax_status_new AS ENUM (
  'resident',
  'source_taxed',
  'cross_border_fr_1983',
  'cross_border_ge',
  'tou'
);

ALTER TABLE public.clients ALTER COLUMN tax_status DROP DEFAULT;

ALTER TABLE public.clients
  ALTER COLUMN tax_status TYPE public.tax_status_new
  USING (
    CASE tax_status::text
      WHEN 'ordinary_resident' THEN 'resident'
      WHEN 'non_taxable'       THEN 'resident'
      WHEN 'cross_border_g'    THEN 'cross_border_fr_1983'
      WHEN 'quasi_resident'    THEN 'tou'
      ELSE tax_status::text
    END
  )::public.tax_status_new;

ALTER TABLE public.clients ALTER COLUMN tax_status SET DEFAULT 'resident'::public.tax_status_new;

DROP TYPE public.tax_status;
ALTER TYPE public.tax_status_new RENAME TO tax_status;