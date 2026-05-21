## Lot 1 — Cohérence et exhaustivité des calculs prévoyance

Objectif : tous les montants affichés (fiche client, onglets, PDF) doivent être issus d'une même source de vérité, et couvrir l'ensemble des prestations AVS/AI et LPP (vieillesse, invalidité, décès).

Les lots 2 (taux de change), 3 (feedback) et 5 (analyse réclamation) seront livrés ensuite, une fois ce socle stable.

---

### 1. Harmonisation LPP — fiche client ⇄ onglet « 2e pilier & rachats »

**Problème actuel** : la projection affichée dans la fiche client (`projectClientLPP`) est faite sans rachats et avec des hypothèses fixes (1.25%/0.6%/1%). L'onglet LPP affiche un autre montant car il intègre les rachats saisis dans le formulaire. D'où le bandeau « Cette simulation diverge… ».

**Cible** :

- Étendre `client_pension` avec un champ `lpp_planned_buybacks jsonb` (liste `{ year, amount, label? }`), en plus du `lpp_buybacks_done` déjà existant.
- `projectClientLPP` lit ces rachats planifiés et les injecte dans `projectLPP` → la projection « officielle » de la fiche inclut désormais les rachats planifiés.
- Sur l'onglet LPP (`/calculators/lpp` ouvert depuis une fiche) :
  - Préremplir le formulaire avec les rachats planifiés sauvegardés.
  - Ajouter un bouton **« Appliquer à la fiche client »** qui persiste les rachats édités dans `client_pension.lpp_planned_buybacks` (et le rendement/taux conversion si modifiés via un nouveau champ `lpp_assumptions jsonb`).
  - Tant que rien n'est appliqué, garder l'usage actuel (mode what-if local) **mais** afficher un bandeau neutre « Simulation non sauvegardée » au lieu du message de divergence.
- Une fois `Appliquer` cliqué, plus aucune divergence possible : le montant fiche = montant onglet au franc près.

**Pré-supprimer** : le bandeau ambre « Cette simulation diverge… » devient inutile et est retiré.

---

### 2. AVS/AI — Rentes enfants et survivants (échelle 44, 2026)

`src/lib/avs/` ne calcule aujourd'hui que la rente de vieillesse. À ajouter :

- **Rentes enfants** (vieillesse & AI) : 40% de la rente principale par enfant, plafond cumulé 60% × max (couple/famille).
- **Rente de veuf/veuve** : 80% de la rente vieillesse théorique de la personne décédée, avec conditions âge/enfants.
- **Rente d'orphelin** : 40% (orphelin simple) ou 60% (double), plafond 60% × max.
- Application du **plafonnement familial** : somme rentes parent + enfants ≤ 150% du max individuel.

Nouvelles fonctions dans `src/lib/avs/index.ts` :

```ts
projectAvsChildPension(parent, childAge): { annual, monthly }
projectAvsSurvivorPensions(deceased, family): { widow, orphans[] }
```

Couverture par tests unitaires (cas standards + plafonnement).

---

### 3. Calculateur AVS/AI — UI étendue

Dans `src/routes/_app/calculators/avs-ai.tsx`, ajouter un sélecteur d'**événement** :

- Vieillesse (actuel)
- Invalidité (taux 25/50/75/100%)
- Décès → affiche rentes survivants

Le résultat additionne automatiquement :

- **Vieillesse** : AVS individuelle + rente enfants éventuelle.
- **Invalidité** : AI proratisée + rentes enfants AI.
- **Décès** : rente veuf/veuve + rentes orphelins (1 ligne par enfant).

Sauvegarde dans `simulation_history` (kind `avs_ai`) avec le scénario choisi.

---

### 4. Consolidation 1er + 2e pilier

Nouveau module `src/lib/pension-consolidation/index.ts` :

```ts
consolidatePension(bundle, event: "retirement" | "disability" | "death"): {
  pillar1: { items: [...], total },
  pillar2: { items: [...], total },
  combinedAnnual, combinedMonthly,
}
```

- **Retraite** : AVS vieillesse + enfants AVS + LPP vieillesse (capital × taux conv).
- **Invalidité** : AI proratisée + enfants AI + rente invalidité LPP (basée sur avoir projeté à 65 ans, taux de conversion).
- **Décès** : AVS veuf/veuve + orphelins + rente survivant LPP (60% rente invalidité) + orphelins LPP (20%).

Affichage :

- Nouvelle section **« Prestations consolidées »** sur la fiche client (`ClientDashboardSections`) avec 3 cartes (Retraite / Invalidité / Décès).
- Réutilisée dans le PDF de synthèse (`src/lib/pdf/synthesis-report.ts`).

---

### 5. Fiscalité globale — champ 3e pilier B

- Étendre `TaxGlobalInput` avec `pillar3bContributions: number`.
- L'inclure dans les déductions du moteur `computeTaxGlobal` (lié à la déduction primes d'assurance/intérêts épargne selon le canton — utiliser la même règle que `healthInsurancePremiums` qui existe déjà).
- Ajouter le champ dans le formulaire `/calculators/tax-global` (section Optimisations).
- Persister dans `simulation_history.inputs` et l'inclure dans le PDF d'export.

---

### Détails techniques

**Migration DB** :

```sql
ALTER TABLE public.client_pension
  ADD COLUMN lpp_planned_buybacks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN lpp_assumptions jsonb;  -- { expectedReturnRate, feeRate, salaryGrowthRate, conversionRate }
```

**Fichiers créés** :
- `src/lib/pension-consolidation/index.ts` + tests
- `src/lib/avs/survivors.ts` (rentes enfants/survivants) + tests
- `src/components/clients/ConsolidatedBenefitsCard.tsx`

**Fichiers modifiés** :
- `src/lib/client-dashboard/lpp-projection.ts` (injection rachats planifiés)
- `src/lib/avs/index.ts` (export survivor APIs)
- `src/routes/_app/calculators/lpp.tsx` (bouton « Appliquer à la fiche », suppression bandeau divergence)
- `src/routes/_app/calculators/avs-ai.tsx` (sélecteur événement, rentes étendues)
- `src/lib/tax-global/types.ts` + `engine.ts` + `src/routes/_app/calculators/tax-global.tsx`
- `src/components/clients/ClientDashboardSections.tsx` (insertion carte consolidée)
- `src/lib/pdf/synthesis-report.ts` (nouvelle section consolidée)
- `src/lib/clients/types.ts` + `src/integrations/supabase/types.ts` (regen automatique post-migration)

**Vérifications** :
- Test unitaire : ouvrir une fiche client avec rachats planifiés → la projection LPP de la fiche = celle de l'onglet (assert à 1 CHF près).
- Test AVS : couple 2 enfants, décès du conjoint principal → veuve + 2 orphelins ≤ plafond familial 150%.
- Consolidation : retraite couple → AVS + LPP additionnés, plafond couple AVS respecté.
- Tax-global : 3b 5'000 CHF déductible réduit l'impôt revenu.

---

### Hors scope (lots suivants)

- **Lot 2** — Module « Analyse réclamation fiscale taux de change » (AFC + ECB/BNS, génération courrier+PDF).
- **Lot 3** — Système de remarques / feedback utilisateurs.

À planifier dès que le Lot 1 est validé en preview.