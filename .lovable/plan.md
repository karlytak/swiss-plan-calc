# Plan – Optimisation calculateurs piliers en 2 phases

**Fil rouge** : tous les comparateurs adoptent un **affichage en écran scindé** (split-screen) avec **Situation actuelle (client)** à gauche et **Situation projetée Piliarys** à droite, plus un bandeau de synthèse en bas (économie + gain retraite).

---

## Phase 1 – Comparaison en écran scindé "Actuel vs Projeté" (priorité haute)

### 1.1 · Composant réutilisable `SplitCompareLayout`
Nouveau fichier `src/components/calculators/SplitCompareLayout.tsx` :

```text
┌─────────────────────────────┬─────────────────────────────┐
│ 🔴 SITUATION ACTUELLE       │ 🟢 SITUATION PROJETÉE       │
│ (données fiche client)      │ Piliarys (optimisée)        │
│                             │                             │
│ • Revenu / capital actuel   │ • Avec optimisations        │
│ • Cotisations / rachats     │ • Plan recommandé           │
│ • Impôt / rente             │ • Impôt / rente projetés    │
├─────────────────────────────┴─────────────────────────────┤
│ 💰 Économie annuelle  │  📈 Gain retraite  │  Δ % delta   │
└────────────────────────────────────────────────────────────┘
```

- Colonnes côte à côte ≥ lg, empilées sur mobile.
- Codes couleur : rouge atténué (actuel) / vert (projeté).
- Mise en évidence visuelle des deltas par ligne (flèche + montant).
- Bandeau synthèse final obligatoire : économie annuelle CHF, gain retraite (capital ou rente), % d'amélioration.

### 1.2 · Intégration dans les calculateurs liés client
Appliquer le layout à :

- **`pillar3a.tsx`** : actuel (cotisation client) vs projeté (max légal + canton de retrait optimal).
- **`lpp.tsx`** : actuel (capital projeté sans rachat) vs projeté (avec plan de rachat recommandé).
- **`retirement.tsx`** : rente actuelle vs rente avec optimisation 3a + rachats LPP.
- **`canton-compare.tsx`** : canton de résidence vs canton optimisé (défaut **Zoug**), avec nouveau **mode "Retrait de capital"** (2 cantons, montant, barème prestations en capital, calcul delta).
- **`avs-ai.tsx`** : actuel vs projeté (informatif, combine AVS + LPP pour rente totale).

### 1.3 · Corrections rapides associées
- **Salaire éditable dans rachat LPP dirigeant** (`DirectorLppBuybackCard.tsx`) : champ `NumField` éditable, prérempli depuis la fiche client mais override toujours possible — y compris en mode libre.
- **Tooltip "Plan cadre 1e"** (sélecteur Plan LPP dans `director-compensation.tsx`, `lpp.tsx`, wizard client) :
  > "Le plan cadre 1e est une solution de prévoyance surobligatoire destinée aux salaires élevés. Il permet une plus grande flexibilité d'investissement et une optimisation fiscale, mais implique un niveau de risque plus élevé selon la stratégie choisie."

### 1.4 · Comparateur cantonal – mode retrait de capital
Dans `canton-compare.tsx` :
- Switch de mode : `Revenu courant` (existant) / `Retrait capital LPP / 3a`.
- En mode retrait : sélection canton résidence + canton de retrait (défaut ZG) + montant.
- Calcul via barème spécifique prestations en capital (1/5 IFD + barème cantonal capital).
- Split-screen côté résidence vs côté retrait + delta économisé.
- Encart d'avertissement : domicile fiscal au moment du retrait requis.

---

## Phase 2 – Cohérence inter-piliers AVS + LPP + 3e (priorité moyenne)

### 2.1 · Module "Rente consolidée"
Étendre `src/components/clients/ConsolidatedBenefitsCard.tsx` + `src/lib/pension-consolidation/` pour afficher dans un même bloc :

- **Retraite** : AVS + LPP (+ rente 3a si applicable) — mensuel & annuel.
- **Invalidité (AI)** : rente AI fédérale + rente LPP invalidité (60 % salaire assuré par défaut).
- **Décès – conjoint** : rente AVS veuf/veuve (selon conditions légales : enfant à charge, ≥45 ans + ≥5 ans mariage) + rente LPP survivant (60 % rente vieillesse).
- **Décès – orphelin** : rente AVS + LPP par enfant.

### 2.2 · Hypothèses partagées
Centraliser dans `pension-consolidation/` pour garantir que AVS, LPP, retirement.tsx utilisent **les mêmes** : âge, salaire, années de cotisation, plan LPP.

### 2.3 · Split-screen "Couverture actuelle vs projetée"
Sur la fiche client et dans `retirement.tsx`, appliquer le même layout `SplitCompareLayout` aux 3 cas (retraite / AI / décès) : couverture actuelle vs couverture avec optimisations Piliarys.

### 2.4 · Affichage rente totale
Mensuel + annuel partout (fiche client, retirement, AVS-AI).

---

## Hors scope

- Refonte visuelle du dashboard.
- Export PDF spécifique (réutilisation `ExportPdfButton` existant).
- Migration base de données (rien de prévu — tout dérive de `clients`, `client_pension`, `client_assets`).

---

## Détails techniques

- **Composant central** : `SplitCompareLayout` (props : `currentLabel`, `projectedLabel`, `rows: { label, currentValue, projectedValue, format }[]`, `summary: { annualSaving, retirementGain, deltaPercent }`).
- **Réutilisation** : `CalcUI`, `MoneyTile`, `WikiTip`, `FiscalSnapshotBanner`, `usePrefillFromClient`.
- **i18n** : tout nouveau texte dans `src/lib/i18n/fr.ts` (+ EN/DE/IT en stub).
- **Barèmes capital cantonaux** : vérifier présence dans `tax_year_data`, ajouter via migration si manquant (Phase 1.4).
- **Pas de DB change** dans Phase 1.1–1.3 ni Phase 2.

---

## Livraison suggérée

**Phase 1 en premier** (4-6 j) : débloque immédiatement les irritants signalés et installe le pattern split-screen partout. **Phase 2** (3-4 j) ensuite pour la consolidation inter-piliers.
