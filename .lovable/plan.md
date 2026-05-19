## Objectif

Sur la fiche client, supprimer les chips/liens vers les 4 anciens calculateurs fiscaux (Impôt revenu, Impôt à la source, Frontalier, TOU). Toute la fiscalité passe désormais par le **Calculateur Fiscal Global** déjà pré-rempli depuis la fiche client.

## Corrections

### 1. `src/components/clients/ClientCalculatorBar.tsx`
Retirer du tableau `CHIPS` les 4 entrées :
- `/calculators/cross-border` (Frontalier)
- `/calculators/income-tax` (Impôt revenu)
- `/calculators/source-tax` (Impôt à la source)
- `/calculators/tou` (TOU)

Ajouter à la place une seule entrée en tête de section fiscalité :
- `/calculators/tax-global` → label "Fiscalité globale", icône `Calculator`, kind `tax_global` (ajout du kind si manquant dans `SimulationKind`, sinon réutiliser `income_tax` comme clé d'historique).

Nettoyer les imports d'icônes devenus inutilisés (`Coins`, `Globe2`, `Receipt`).

### 2. `src/components/clients/ClientDashboardSections.tsx`
Rediriger les `detailLink` des cartes fiscales vers le calculateur global :
- Ligne 39 (DashboardOverview, carte "Charge fiscale annuelle") : `/calculators/income-tax` → `/calculators/tax-global`
- Ligne 183 (DashboardFiscal, carte "Charge fiscale détaillée") : `/calculators/income-tax` → `/calculators/tax-global`

### 3. `src/lib/clients/calculator-relevance.ts`
Vérifier que `/calculators/tax-global` est bien reconnu comme route pertinente quel que soit le profil (résident, frontalier, source, TOU) puisque le calculateur global gère tous les régimes en interne. Si la route est absente du type `CalcRoute` / de la fonction `getCalculatorRelevance`, l'ajouter avec `relevant: true` par défaut dès que canton + salaire sont saisis.

### 4. Vérification synchro fiche → tax-global
La synchro est déjà branchée :
- `src/hooks/usePrefillFromClient.ts` ligne 58 mappe `"tax-global"` → `toTaxGlobalInput`
- `src/routes/_app/calculators/tax-global.tsx` appelle `usePrefillFromClient(clientId, "tax-global")`

Re-tester rapidement après nettoyage qu'un clic depuis la fiche client ouvre bien `/calculators/tax-global?clientId=...` avec le formulaire pré-rempli (canton, pays résidence, état civil, salaire, conjoint, enfants, fortune, 3a…).

### 5. Routes des 4 anciens calculateurs
**Conserver** les fichiers de routes `src/routes/_app/calculators/{income-tax,source-tax,cross-border,tou}.tsx` car ils sont déjà accessibles depuis l'index des calculateurs hors fiche client, et leur suppression casserait `routeTree.gen.ts` et la liste globale. Seuls les **liens depuis la fiche client** sont retirés.

## Hors scope (à confirmer si besoin)

Tu mentionnes aussi "rendement vs capital" : c'est le calculateur **Rente vs Capital** (retraite), qui n'est pas un calculateur fiscal. Je le **laisse en place** dans la barre de la fiche client sauf indication contraire de ta part.

## Fichiers modifiés

- `src/components/clients/ClientCalculatorBar.tsx`
- `src/components/clients/ClientDashboardSections.tsx`
- `src/lib/clients/calculator-relevance.ts` (si la route tax-global y manque)