## Plan approuvé, prêt à implémenter

### 1. Corriger le comparateur fiscal global

Dans `TaxGlobalCompareCard` :
- Clarifier les libellés : « Situation déclarée (ce que vous avez saisi) » vs « Avec tous les leviers fiscaux activés ».
- Ajouter un bloc « Pourquoi l'économie projetée est-elle nulle ou très faible ? » qui apparaît quand l'écart est < 100 CHF. Il liste les raisons réelles :
  - 3a déjà au plafond,
  - rachat LPP saisi déjà supérieur ou égal à la cible (donc inclus dans l'actuel),
  - aucune capacité de rachat LPP renseignée sur la fiche client,
  - accord 1983 : aucune déductibilité côté FR,
  - démarche TOU / rectification IS non effectuée,
  - TOU non avantageuse cette année.
- Note pédagogique : un rachat LPP n'apparaît comme nouveau gain que s'il n'est pas déjà dans la situation actuelle, et seulement si la TOU ou la taxation ordinaire s'applique.

### 2. Composant réutilisable d'alerte d'impact croisé

Nouveau fichier `src/components/calculators/CrossCalcImpactBanner.tsx` :
- Bandeau compact en haut de chaque calculateur.
- Indique « Toute modification ici peut faire bouger ces écrans » + liste de pastilles cliquables vers les calculateurs liés.
- Chaque pastille précise quoi aller regarder (« Impact sur le capital LPP final », « Économie d'impôt annuelle », etc.).
- Conserve le `clientId` dans les liens pour rester sur la même fiche client.
- Configuration centralisée `IMPACT_MAP` pour les 16 calculateurs (tax-global, income-tax, source-tax, cross-border, tou, pillar3a, lpp, vested-benefits, retirement, avs-ai, health-insurance-france, canton-compare, director-compensation, investment-compare, overtime, fx-claim).

### 3. Intégration dans tous les calculateurs

Ajout d'une ligne `<CrossCalcImpactBanner calculator="..." clientId={clientId} />` juste après le hero / titre dans :
- tax-global, income-tax, source-tax, cross-border, tou
- pillar3a, lpp, vested-benefits, retirement, avs-ai
- health-insurance-france, canton-compare, director-compensation
- investment-compare, overtime, fx-claim

Pour les calculateurs qui n'exposent pas `clientId` dans leur `validateSearch`, je l'ajoute en option (champ optionnel UUID), aucune régression sur les usages existants.

### Notes techniques
- Aucune modification du moteur de calcul fiscal : c'est la lisibilité et le câblage du scénario projeté qui sont corrigés.
- Si un cas réel d'erreur de calcul apparaît après ces corrections (par exemple TOU GE qui ne déduit pas alors qu'elle le devrait), je le traiterai en correction ciblée dans `engine.ts`.
- Sonner reste disponible plus tard pour des notifications « live » au changement, mais le bandeau statique est intégré tout de suite à tous les écrans comme demandé.