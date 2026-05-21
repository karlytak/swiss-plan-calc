## Objectif

Dans `/calculators/tax-global`, section **Revenus**, corriger 3 problèmes :

1. Le **total des revenus bruts** n'est pas visible — l'utilisateur ne voit pas que tout s'additionne réellement (le moteur le fait, mais l'UI ne l'affiche pas).
2. Aucune **bulle d'info (i)** sur les champs ambigus : valeur locative, revenus étrangers, revenus locatifs, autres revenus.
3. Les **revenus étrangers** sont saisis en CHF sans possibilité de saisir une autre devise avec conversion automatique.

## Changements UI (frontend uniquement)

### 1. Total cumulé affiché en direct
Ajouter en bas de l'accordéon **Revenus** un encart récapitulatif :
```
Revenu brut total      :  XXX'XXX CHF
  Salaire principal    :  …
  + Bonus / 13e        :  …
  + Salaire conjoint   :  …  (si couple)
  + Autres revenus     :  …
  + Revenus locatifs   :  …
  + Valeur locative    :  …  (incluse dans l'imposable, pas dans le cash)
  + Revenus étrangers  :  XX'XXX EUR → YY'YYY CHF (taux X.XXXX)
```
Pour confirmer visuellement que **tout s'additionne**.

### 2. Bulles d'information (icône `Info` + `Tooltip`)
Sur chaque champ revenu, petit `i` avec explication suisse officielle :

- **Salaire brut** : « Salaire annuel brut figurant sur le certificat de salaire (case 1 / 8), avant déductions sociales (AVS, AI, AC, LPP). »
- **Bonus / 13e** : « Gratifications, 13e salaire, part variable. Imposés comme le salaire ordinaire. »
- **Autres revenus** : « Revenus accessoires : jetons de présence, indemnités, activités indépendantes secondaires, rentes imposables. »
- **Revenus locatifs** : « Loyers nets perçus d'immeubles loués (après charges déductibles), avant entretien et intérêts hypothécaires qui s'inscrivent en déductions. »
- **Valeur locative** : « Revenu fictif imposé pour les propriétaires occupants de leur résidence principale ou secondaire en Suisse (art. 21 LIFD). Représente le loyer que vous paieriez si vous louiez votre bien. Incluse dans le revenu imposable, mais pas dans votre cash réel. »
- **Revenus étrangers** : « Revenus de source étrangère (salaire, dividendes, loyers d'immeubles hors CH). En Suisse, ils sont exonérés mais retenus pour la **progressivité du taux** (méthode d'exemption avec réserve de progressivité, art. 7 LIFD). À convertir en CHF au taux AFC de l'année. »

### 3. Conversion devise pour revenus étrangers
Remplacer le champ unique `foreignIncome (CHF)` par un mini-bloc :
- **Devise** : `Select` (CHF / EUR / USD / GBP / CAD / JPY — listes déjà dans `src/lib/fx/sources.ts`)
- **Montant** : `NumField` dans la devise choisie
- **Source du taux** : `Tabs` `AFC officiel ({année}) ↔ Marché du jour`
  - AFC : lit `AFC_ANNUAL_RATES[g.taxYear][devise]`
  - Marché : appel à `fetchMarketRates` (server fn existant, gère weekend/fallback)
- **Affichage** : `→ XXX'XXX CHF (taux X.XXXX, source AFC 2025)` sous le champ
- Stockage interne : conversion → push de la valeur CHF dans `form.foreignIncome` (le moteur reste inchangé)

État local additionnel dans `tax-global.tsx` :
```ts
const [fxCurrency, setFxCurrency] = useState<"CHF"|"EUR"|"USD"|"GBP"|"CAD"|"JPY">("CHF");
const [fxAmount, setFxAmount]     = useState(0);
const [fxSource, setFxSource]     = useState<"afc"|"market">("afc");
const [fxRate, setFxRate]         = useState<number|null>(null);
```
Effect : recalculer `foreignIncome` en CHF quand devise / montant / source / année change.

## Détails techniques

| Fichier | Modification |
|---|---|
| `src/routes/_app/calculators/tax-global.tsx` | Ajouter `IncomeTotalsCard` sous le grid, ajouter `<Info/>` + `<Tooltip>` sur chaque `NumField` revenu, remplacer le champ `foreignIncome` par un bloc devise+montant+source+taux |
| `src/components/calculators/IncomeTotalsCard.tsx` *(nouveau, optionnel inline)* | Petit composant qui liste chaque ligne + total, formaté `fr-CH` |
| `src/lib/i18n/{fr,en,de,it}.ts` | Clés `calc.global.tip.gross_salary` / `.bonus` / `.other_income` / `.rental_income` / `.imputed_rent` / `.foreign_income` + `calc.global.field.foreign_currency`, `.foreign_amount`, `.fx_source_afc`, `.fx_source_market`, `.income_total` |

Réutilisations existantes :
- `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` → `@/components/ui/tooltip`
- `Info` icon → `lucide-react`
- `AFC_ANNUAL_RATES`, `SUPPORTED_CURRENCIES` → `src/lib/fx/sources.ts`
- `fetchMarketRates` → `src/lib/fx/fetch.functions.ts`
- `formatCHF` → `src/lib/format.ts`

## Hors scope
- Aucune modification du moteur (`engine.ts`, `income.ts`, `scenarios.ts`) — la logique d'addition existe déjà côté calcul, on rend juste l'addition visible et on convertit l'entrée.
- Pas de changement DB / types Supabase.
- Les autres sections (déductions, comparateur, synthèse) ne sont pas touchées.
