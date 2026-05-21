
## Pourquoi un plan en deux parties

Tu poses deux questions distinctes :
1. **« Sur quoi se basent les chiffres ? »** → besoin de transparence : aucun écran ne montre actuellement la chaîne fiche client → revenu brut → déductions → taxable → impôts.
2. **« C'est faux pour la plupart, rectifier si besoin »** → j'ai identifié 7 écarts réels en lisant le code. Je les liste ci-dessous, tu valides ceux à corriger.

---

## Partie A — Panneau « Comment ce résultat est calculé » (transparence)

Ajout, sous la carte « Résultats » du calculateur, d'un bloc dépliable structuré en 5 sections :

### 1. Régime détecté — pourquoi
- Affiche les 3 données qui ont déclenché la détection : canton + permis + pays de résidence.
- Cite la règle (« Résidence FR + travail GE → frontalier GE accord 1973 », « Permis B/L + ≥90% revenu CH → quasi-résident TOU », etc.).
- Source légale courte (LIFD art. 5, accord 1983, etc.).

### 2. Origine de chaque donnée
Tableau « Champ → valeur → source » pour chaque ligne du form :
- Salaire brut → `clients.gross_annual_salary`
- Bonus → `clients.bonus`
- Conjoint → `clients.spouse_gross_annual_salary`
- 3a → `client_pension.pillar_3a_annual_contribution`
- Rachat LPP → `client_pension.lpp_buybacks_done` (année en cours) **+ planifiés** (cf. correction #1)
- Fortune nette → somme `client_assets` (immobilier + titres + bancaire + véhicules + autres − dettes)
- Valeur locative / loyer → `client_assets.real_estate_rental_value` (avec règle « occupant vs bailleur »)
- Intérêts hypothécaires → `client_assets.mortgage_interest`
- Etc.

Chaque ligne dit « ✅ depuis fiche client » ou « ⚠️ saisie manuelle uniquement (non persisté) ».

### 3. Chaîne de calcul exposée
Pour le régime actif, on affiche les nombres intermédiaires (déjà tous dans `result.income.deductions` mais jamais montrés) :
```
Revenu brut total          = X CHF
− AVS/AI/APG (5.3%)        = …
− AC (1.1% jusqu'à 148 200) = …
− LPP part salarié         = …
− 3a                       = …
− Rachat LPP               = …
− Frais pro (forfait 3% net, min 2000 / max 4000) = …
− Primes santé (forfait cantonal X / fédéral) = …
− Intérêts hypothécaires   = …
− Entretien immobilier     = …
− Frais de garde           = …
− Dons                     = …
= Revenu imposable ICC     = …
− Déduction enfants IFD (6 700/enfant) = …
= Revenu imposable IFD     = …

IFD (barème art. 36 LIFD)        = …  − rabais enfant (259) = …
ICC cantonal (barème {canton})   = …  × coefficient cantonal
ICC communal (multiplicateur {commune}) = …
Impôt église ({confession})      = …
Impôt fortune ({canton})         = …
```

### 4. Hypothèses et défauts utilisés
- Forfaits cantonaux primes maladie 2026 (table `HEALTH_INSURANCE_CANTONAL_2026`)
- Plafond 3a affilié LPP : 7 258 CHF (×2 si couple)
- Plafond AC 2026 : 148 200 CHF
- Bonifications LPP par tranche d'âge
- Multiplicateur communal utilisé (chef-lieu par défaut si commune non résolue)
- Taux de change EUR/CHF utilisé (frontaliers)
- Primes LAMal mensuelles utilisées (frontaliers uniquement)

### 5. Limites du modèle
Liste explicite des choses que le calculateur **ne fait pas** :
- Pas de progressivité mondiale pour `foreignIncome` (cf. correction #5)
- Frontalier FR : la part étrangère est une estimation, pas la déclaration FR réelle
- Concubinage : barème célibataire individuel, pas de mutualisation
- TOU : compare uniquement sur 1 année, pas d'effet pluriannuel

**Fichiers touchés Partie A :**
- `src/routes/_app/calculators/tax-global.tsx` : nouveau composant `<TaxGlobalExplanation />` (≈ 200 lignes), rendu sous la carte Résultats.
- `src/lib/tax-global/engine.ts` : exposer les valeurs intermédiaires déjà calculées (aucun nouveau calcul) via un champ optionnel `result.trace` dans `TaxGlobalResult`.
- `src/lib/tax-global/types.ts` : ajouter le type `TaxGlobalTrace`.
- `src/lib/i18n/fr.ts` (+ de/en/it) : clés `calc.global.explain.*`.

---

## Partie B — Corrections à valider

J'ai relu engine.ts / profile.ts / to-calculator-input.ts. Voici les écarts réels (ordre de priorité décroissant) :

### #1 — Rachats LPP planifiés ignorés (impact direct sur déductions)
`toTaxGlobalInput` ne lit que `lpp_buybacks_done` (rachats déjà effectués). Si le courtier a planifié un rachat 2026 dans `lpp_planned_buybacks`, il n'apparaît pas dans la déduction LPP de l'année courante.
→ **Fix :** `lppBuyback = sumLppBuybacksForYear(done, year) + sumPlannedForYear(planned, year)`.

### #2 — Multiplicateur communal non utilisé (impact ICC)
`computeIncomeTax` reçoit canton mais pas `communalMultiplier`. Conséquence : pour Genève-Ville vs Vernier vs Carouge, on a le même chiffre alors que les coefficients communaux varient de +5 à +20 points. Idem VS/VD/FR/NE.
→ **Fix :** dans `toIncomeTaxInput` (engine.ts), résoudre le multiplicateur via `getCommuneMultiplier(canton, commune)` (helper à créer si manquant, ou table inline). Si commune absente, garder le défaut chef-lieu **et l'afficher dans le panneau d'explication**.

### #3 — Frontalier hors GE/accord-1983 mal étiqueté
`detectRegime` retombe sur `regime: "cross_border_ge"` même pour un frontalier ZH/BS/etc., avec un label trompeur. Conséquence : l'UI affiche « Frontalier Genève » pour un travailleur de Zurich.
→ **Fix :** créer le régime `cross_border_other` (label + reason corrects). Côté calcul, garder la même logique (IS canton de travail + impôt pays de résidence).

### #4 — `cohabiting` jamais propagé depuis la fiche client
`to-calculator-input.ts` ligne 442 : la liste de validation `["single", "married", "registered_partnership", "divorced", "separated", "widowed"]` **n'inclut pas `cohabiting`**. Si l'état civil DB est `cohabiting` (déjà supporté par `civil_status` enum), il tombe en `single` silencieusement.
→ **Fix :** ajouter `"cohabiting"` à la liste.

### #5 — `foreignIncome` annoncé pris en compte, mais ignoré
Le résident ordinaire avec revenu étranger reçoit une note « retenu pour le taux effectif » dans l'UI. **C'est faux** : `computeIncomeTax` n'utilise jamais `foreignIncome`. Le taux effectif est calculé sur les seuls revenus CH.
→ **Fix au choix** :
  - **Option A (rapide)** : reformuler la note en « Revenu étranger non pris en compte dans le calcul — à reporter manuellement en déclaration suisse pour la progressivité ».
  - **Option B (complète)** : implémenter la méthode d'exemption avec progressivité (calcul IFD/ICC sur revenu mondial → application du taux moyen aux seuls revenus CH). +1 j de travail.

### #6 — LAMal estimée pour résident ordinaire à partir de défauts cachés
Pour un résident ordinaire CH, la carte Résultats affiche `socialChargesCHF` = 200×12×2 + 49.4×12×0 = **4 800 CHF** estimés en LAMal, **alors que les champs LAMal sont masqués pour ce régime** (visibles uniquement frontalier). Le net cash s'en trouve faussé.
→ **Fix :** soit afficher les champs LAMal aussi pour résident, soit ne **pas** soustraire `socialChargesCHF` du net pour résident (le marquer « non estimé »).

### #7 — `eurChfRate` et `chfToEurRate` désynchronisables
Deux champs indépendants alors que mathématiquement `chfToEurRate ≈ 1 / eurChfRate`. Si l'utilisateur change l'un, l'autre reste périmé → conversion CMU/LAMal incohérente avec la part étrangère.
→ **Fix :** un seul champ `eurChfRate`, dérivation auto de `chfToEurRate = 1 / eurChfRate`. Garder l'API du moteur inchangée.

---

## Vérifications après implémentation
- Tests unitaires existants (`src/lib/tax/*.test.ts`, `src/lib/swiss/cantons.test.ts`) doivent rester verts.
- Cas de référence à valider à la main :
  - Résident GE, célibataire, 120k brut, 0 déduction → comparer avec calculatrice AFC GE.
  - Frontalier GE, 100k brut, marié 2 enfants → comparer avec simulateur impôts.gouv + barème IS GE.
  - Quasi-résident VD, permis B, 95% CH → vérifier que TOU déclenche bien.

---

## Questions avant d'implémenter

1. **Correction #5** (revenu étranger) : Option A (note honnête) ou Option B (vrai calcul de progressivité) ?
2. **Correction #6** (LAMal résident) : afficher les champs ou désactiver l'estimation ?
3. Tu veux que je fasse tout en un seul lot, ou seulement la Partie A (transparence) d'abord pour que tu vérifies les chiffres toi-même avant de corriger ?
