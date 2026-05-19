
## Objectif

Quand le client est frontalier France, l'utilisateur ne doit plus se demander pourquoi 6 cantons affichent le même chiffre. Il faut **expliquer le régime appliqué** et **regrouper visuellement** les cas identiques.

## Ce que je vais ajouter dans `canton-compare.tsx`

### 1. Bandeau contextuel en haut du tableau (mode "annuel")

Affiché automatiquement selon le régime détecté pour le client courant :

- **Frontalier accord 1983** (résidence FR + canton VD/VS/NE/JU/FR/BE) →
  bandeau ambre :
  > « Régime frontalier — accord franco-suisse 1983. L'impôt est dû **en France uniquement** pour VD, VS, NE, JU, FR, BE. Le canton suisse de travail ne change pas le montant. Seul **Genève** prélève à la source en Suisse. »

- **Frontalier Genève** (résidence FR + GE) →
  bandeau bleu :
  > « Frontalier Genève — imposition à la source genevoise (IS) + résidu éventuel en France. Les autres cantons sont indiqués à titre comparatif (impôt français applicable). »

- **Résident CH** → pas de bandeau spécifique (la comparaison cantonale est pleinement pertinente).

### 2. Étiquette « lieu d'imposition » par ligne

Ajouter à côté du régime déjà affiché un petit badge :
- 🇨🇭 `Imposition CH` (résident ordinaire, source, TOU, GE frontalier)
- 🇫🇷 `Imposition FR` (accord 1983)
- 🇨🇭+🇫🇷 `Mixte` (cas source CH + résidence FR hors accord)

### 3. Regroupement visuel des cantons accord 1983

Dans le tableau, quand le régime détecté est `cross_border_fr_1983` pour plusieurs cantons avec le **même montant**, les afficher dans un bloc replié :

```text
┌──────────────────────────────────────────────────┐
│ Accord 1983 — Imposition France (identique)      │
│ 6 cantons · 23 421 CHF · 23,4%                   │
│ VD · VS · NE · JU · FR · BE        [Déplier ▾]   │
└──────────────────────────────────────────────────┘
```

Une fois déplié, les 6 lignes restent visibles individuellement (pour l'export PDF et la transparence). Replié par défaut pour alléger la lecture.

### 4. Tooltip enrichi sur chaque ligne

Au survol du nom du canton, expliquer en une phrase :
- VD/VS/NE/JU/FR/BE (frontalier FR) → « Accord 1983 : impôt prélevé en France, le canton suisse ne taxe pas. »
- GE (frontalier FR) → « IS genevoise + 4,5 % rétrocédés à la France. »
- ZG/SZ (résident CH) → « Canton à fiscalité avantageuse, référence du comparateur. »

## Ce que je ne touche pas

- Aucun moteur fiscal n'est modifié — uniquement la couche d'affichage.
- Les montants restent ceux calculés par `computeTaxGlobal` (cohérents avec le Fiscal Global).
- Le PDF d'export garde le détail ligne par ligne, sans regroupement.

## Vérification

Je teste sur la fiche client courante (`09278d25...`, frontalier FR à GE) :
- bandeau ambre visible avec mention « accord 1983 »
- bloc replié « Accord 1983 — 6 cantons identiques »
- Genève reste en ligne dédiée avec son montant propre

Puis je bascule mentalement sur un cas résident CH (pas de bandeau, 26 montants distincts) pour confirmer la non-régression.
