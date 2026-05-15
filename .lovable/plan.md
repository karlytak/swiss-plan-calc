# Cohérence inter-calculateurs — diagnostic et plan

## Avertissement honnête

Je ne peux pas livrer en un seul passage : (a) audit des 12 calculateurs, (b) refactor central, (c) refonte de canton-compare, (d) tests preview avec captures sur chaque paire. Je propose un découpage en 2 livraisons. Cette plan couvre **la livraison 1** (le bug bloquant + la fondation centrale). La livraison 2 audite et migre les autres calculateurs.

---

## Diagnostic — pourquoi 221'416 ≠ 554'925

Trois sources de vérité **différentes** coexistent aujourd'hui pour « capital LPP projeté à la retraite » :

1. **Page LPP** (`src/routes/_app/calculators/lpp.tsx`, l.132-142) : recalcule en live via `projectLPP(form)` à partir du **formulaire local** — donc avec rendement / frais / rachats / extraCredit que le courtier vient de saisir.
2. **Dashboard client** (`src/lib/client-dashboard/index.ts`, `buildLPP` l.210-260) : appelle `projectLPP` avec **seulement 5 champs** (age, balance, salaire assuré, conversionRate). Tout le reste tombe sur les **défauts** de `projectLPP` (rendement 1.5%, croissance salaire 1%, frais 0, pas de rachat, pas d'extraCredit).
3. **Canton-compare** (`src/routes/_app/calculators/canton-compare.tsx`, l.159-178) : lit en priorité la **dernière simulation sauvegardée** dans `simulation_history` (`projectedBalance` de l'`inputs`/`summary`), avec fallback sur le dashboard. Une simulation sauvegardée est un **snapshot figé** qui contient les rachats / rendement / extraCredit du moment où le courtier a cliqué « Sauvegarder ».

Sur le client TEST :
- 554'925 vient d'une **simulation LPP sauvegardée** (probablement avec rachats planifiés et/ou rendement plus élevé) lue par canton-compare.
- 221'416 est le **recalcul live** sur la page LPP avec les valeurs courantes du formulaire (probablement rachats remis à 0, ou rendement par défaut).

Les deux chiffres sont « corrects » dans leur monde, mais il n'y a **pas de source unique**.

---

## Principe de la correction (validé par votre cahier des charges)

La **fiche client** (+ `client_pension`/`client_assets`) est la source unique de vérité pour les **inputs**. Les **projections** dérivent d'une fonction centrale `computeClientDashboard(bundle)` (déjà existante : `src/lib/client-dashboard/index.ts`) qui doit être :
- la **seule** voie pour obtenir capital LPP projeté, capital 3a projeté, taux marginal, revenu déterminant.
- appelée par tous les calculateurs **comme valeur d'affichage de référence** (« d'après la fiche »).

Les simulations sauvegardées (`simulation_history`) deviennent des **what-if** consultables, **jamais** la source qui alimente un autre calculateur en silence.

---

## Livraison 1 (ce tour)

### A. Aligner la projection centrale sur la projection « page LPP »

`buildLPP` du dashboard ignore aujourd'hui plusieurs paramètres présents en fiche client :
- `lpp_max_buyback` (capacité de rachat) — non injecté dans la projection
- pas de champ « rendement attendu » / « frais » / « croissance salaire » en fiche → on garde les défauts mais on les rend **explicites et identiques partout** via une constante exportée `DASHBOARD_LPP_PROJECTION_DEFAULTS`.

Action :
- Extraire dans `src/lib/client-dashboard/lpp-projection.ts` une fonction unique `projectClientLPP(bundle, opts?)` qui retourne `{ projectedBalance, annualPension, monthlyPension, currentCapital, buybackCapacity, assumptions }`. Elle expose les **hypothèses utilisées** (rendement, frais, etc.) pour affichage.
- `buildLPP` du dashboard appelle cette fonction.
- Idem `project3a` → `projectClient3a(bundle)`.

### B. Canton-compare lit la projection centrale, pas l'historique

Dans `canton-compare.tsx` :
- **Supprimer** la lecture de `simulation_history` comme source primaire.
- La valeur initiale du capital LPP / 3a vient **uniquement** de `projectClientLPP(bundle)` / `projectClient3a(bundle)`.
- Garder le champ éditable (override what-if) mais afficher clairement « Source : fiche client » avec les hypothèses (rendement %, conversion %).
- Bouton « Réinitialiser depuis la fiche » qui re-hydrate.

### C. Page LPP affiche un avertissement de divergence

Sur `lpp.tsx`, si le `form` actuel produit un capital différent de celui de la projection centrale (parce que le courtier a saisi un rendement, des rachats, etc. différents), afficher un encart discret : « Cette simulation diverge de la fiche : X CHF vs Y CHF (fiche). [Mettre à jour la fiche] ». Pas de blocage — c'est l'usage normal du what-if.

### D. Tests

- Tests unitaires pour `projectClientLPP` : déterministe, mêmes inputs → mêmes outputs.
- Vérification manuelle preview : ouvrir LPP puis canton-compare sur le client TEST — chiffre identique au franc près tant qu'on ne touche pas au formulaire LPP.

---

## Livraison 2 (tour suivant — à votre demande)

Audit en tableau des 12 calculateurs : pour chacun, lister
1. inputs lus de la fiche (via `to-calculator-input.ts`)
2. projections / valeurs calculées localement qui devraient venir du dashboard central
3. duplications à éliminer

Puis migration calculateur par calculateur vers `useClientDashboard()` pour toute valeur partagée (taux marginal, revenu déterminant, projection 3a, etc.).

---

## Détails techniques

Fichiers touchés en livraison 1 :
- **nouveau** `src/lib/client-dashboard/lpp-projection.ts` — `projectClientLPP`, `projectClient3a`, defaults exportés
- **modifié** `src/lib/client-dashboard/index.ts` — `buildLPP` / `build3a` délèguent
- **modifié** `src/routes/_app/calculators/canton-compare.tsx` — supprime la lecture `simulation_history`, lit le dashboard
- **modifié** `src/routes/_app/calculators/lpp.tsx` — ajoute l'encart de divergence
- **nouveaux tests** `src/lib/client-dashboard/lpp-projection.test.ts`

Risque : la livraison 1 va **faire baisser** le chiffre affiché dans canton-compare (de 554'925 vers ~221'416 sur TEST), parce que la projection centrale ignore aujourd'hui les rachats que la simulation LPP sauvegardée contenait. C'est le **comportement correct** : si le courtier veut intégrer des rachats planifiés, il doit les saisir en fiche (champ `lpp_max_buyback` existe déjà mais n'est pas projeté — la livraison 1 corrige ça). Je vous le signale parce que ça va modifier des chiffres qui s'affichaient avant.

Validez ce plan (ou indiquez ajustements) et je passe à l'implémentation.
