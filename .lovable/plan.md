# Restreindre le barème impôt à la source à A/B/C/H (scope V1 romand)

## Contexte

Le déroulant « Barème impôt à la source » du wizard client affiche 12 codes (A→T), dont L/M/N/P/Q marqués `(DE)` — réservés aux frontaliers allemands dans les cantons alémaniques. Hors scope V1 (GE/VD/VS/FR/NE/JU). Les frontaliers FR/IT sont déjà gérés via `tax_status` (`cross_border_fr_1983`, `cross_border_ge`) + barème A/B/C/H.

## Changements

### 1. `src/lib/swiss/enums.ts`
- Garder `SOURCE_TAX_SCALES` complet (type DB inchangé, données existantes préservées).
- Ajouter `SELECTABLE_SOURCE_TAX_SCALES = ["A", "B", "C", "H"] as const` + helper `getSelectableSourceTaxScales()`.
- Nettoyer les libellés A/B/C/H (retirer toute mention « célibataire/marié » trop courte → garder phrasing actuel, OK).
- Conserver les libellés L→T pour rétrocompat affichage (clients déjà saisis avec L).

### 2. `src/components/clients/ClientWizard.tsx` (ligne ~710)
- Remplacer `SOURCE_TAX_SCALES.map(...)` par `SELECTABLE_SOURCE_TAX_SCALES.map(...)`.
- Si la valeur courante du formulaire est un code hors liste (L→T sur un client legacy), l'afficher en plus avec mention « (legacy hors scope V1) » pour ne pas perdre la donnée à l'édition.
- Ajouter un `hint` mis à jour : « Frontaliers France/Italie : choisir A/B/C/H et renseigner le statut fiscal ci-dessus. »

### 3. `src/lib/i18n/fr.ts` (+ de/en/it)
- Mettre à jour `wizard.field.source_scale.hint` avec la note FR/IT.

### 4. Garde-fou affichage
- `src/routes/_app/clients/$clientId.tsx` : déjà utilise `SOURCE_TAX_SCALE_LABELS` complet → aucun changement, les libellés legacy restent lisibles.

## Hors scope (à ne pas faire)
- Pas de migration DB (le type Postgres reste `text`).
- Pas de suppression des libellés L→T (legacy + futur scope alémanique).
- Pas de changement sur `tax_status` ni sur le moteur de calcul `source.ts`.

## Validation
- Wizard création : déroulant affiche uniquement A/B/C/H.
- Wizard édition d'un client avec `source_tax_scale = "L"` : l'item « L · Frontalier célibataire (DE) — legacy » apparaît en plus, sélectionnable mais marqué.
- Fiche client read-only : libellé complet conservé.
