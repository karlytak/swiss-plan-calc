# Plan détaillé des améliorations restantes

Bloc 1 (revenu unifié) déjà livré et testé. Voici ce qui reste, avec le risque évalué pour chaque item.

## Bloc 2 — Suivi client

### 2.1 Historique versionné des simulations  — RISQUE: moyen
**Problème** : aujourd'hui, chaque sauvegarde écrase la précédente pour un même calculateur sur un même client. Pas de comparaison "avant/après".

**Changements** :
- Migration DB : ajouter colonnes `version` (int, défaut 1) et `label` (text, optionnel) à `simulation_history`. Aucun DROP, aucune perte de données.
- `SaveSimulationButton` : au save, calculer `version = max(version) + 1` pour ce (client_id, kind), et proposer un libellé optionnel ("avant rachat", "scénario A").
- Liste des simulations sur la fiche client : grouper par kind, afficher les versions, bouton "comparer 2 versions" (modal côte-à-côte).

**Ce qui ne change PAS** : structure existante, flux save actuel reste fonctionnel.

### 2.2 Badge "données client modifiées"  — RISQUE: faible
**Problème** : le conseiller ne sait pas qu'une simu sauvegardée est obsolète parce que la fiche a changé depuis.

**Changements** :
- Sur `ClientCalculatorBar` : si `client.updated_at > simulation.created_at` pour ce calculateur, afficher pastille orange "à rafraîchir".
- 100% UI, aucune migration.

### 2.3 PDF synthèse — page de garde + sommaire  — RISQUE: faible
**Changements dans `src/lib/pdf/synthesis-report.ts`** :
- Page 1 : page de garde avec logo conseiller (déjà dans `profiles.logo_url`), nom client, date, mention "valable au …".
- Page 2 : sommaire avec numéros de page (calculés au 2e passage).
- Footer : "Conseiller · {nom} · {date}".

**Ce qui ne change PAS** : sections existantes, calculs, charts.

### 2.4 Export Excel des simulations  — RISQUE: faible
**Nouveau fichier** : `src/lib/xlsx/export-simulation.ts` qui prend une simulation et génère un .xlsx (1 onglet par section : hypothèses, calculs, résultats).
- Bouton "Export XLSX" à côté de "Export PDF" dans la liste des simulations.
- Dépendance déjà présente : `xlsx` (à confirmer, sinon `bun add xlsx`).

---

## Bloc 3 — Sécurité

### 3.1 Audit RLS systématique  — RISQUE: nul (audit seul)
**Action** : lancer le scanner Lovable + revue manuelle des 11 tables (`clients`, `client_assets`, `client_pension`, `client_notes`, `companies`, `profiles`, `scenarios`, `simulations`, `simulation_history`, `simulation_shares`, `tax_year_data`).

D'après ce que je vois déjà :
- ✅ Toutes les tables broker ont `auth.uid() = broker_id` correctement.
- ⚠️ `tax_year_data` est lisible par tout authenticated → OK car données publiques.
- ⚠️ `simulation_shares.access_shared_simulation` est SECURITY DEFINER (bien) avec password hash → OK.

**Livrable** : rapport écrit, pas de migration sauf finding réel.

### 3.2 Rôles dans table dédiée  — RISQUE: à clarifier
**Question pour toi** : as-tu besoin d'un rôle "admin" (vue cross-broker, modération) ou tout reste single-tenant par broker ? Si single-tenant suffit, **on saute ce point** — le modèle actuel est sain.

### 3.3 Validation Zod sur server functions  — RISQUE: faible
**Action** : audit des `createServerFn` du projet, vérifier que chacune a un `.inputValidator(zod...)` avec bornes (montants > 0, années 1900-2100, canton dans liste blanche, longueurs de strings).

Liste des server functions à auditer (je l'établis avant de toucher) — j'ajoute les schémas manquants un par un, sans changer la logique.

### 3.4 Logs PII  — RISQUE: faible
**Action** : `rg "console.log|console.error"` sur `src/**` côté serveur, masquer ou retirer ce qui sort nom/email/AVS/revenu en clair.

### 3.5 Rate-limit PDF  — ABANDONNÉ
La doc plateforme indique de ne pas implémenter de rate-limiting backend ad-hoc. Je le retire.

---

## Bloc 4 — UX, tests, perf

### 4.1 Validation visuelle formulaires  — RISQUE: faible
- Sur les formulaires de la fiche client + calculateurs : helper `<FieldError>` cohérent, bornes (revenu ≥ 0, âge 0-120, année 1900-2100), message en rouge sous le champ.
- 100% UI, aucune logique métier touchée.

### 4.2 Tooltips fiscaux  — RISQUE: nul
- `<Info>` icon avec tooltip shadcn sur les champs : rachat LPP max, plafond 3a, déduction coordination, etc. Textes en 4 langues.

### 4.3 Tests par canton  — RISQUE: nul
- Snapshots de référence pour 3 profils types × 5 cantons (GE, VD, ZH, BE, TI).
- Fichier `src/lib/tax/__tests__/canton-snapshots.test.ts`.

### 4.4 Lazy-load + mémoïsation  — RISQUE: faible
- `React.lazy` sur les routes calculateurs lourdes (`canton-compare`, `investment-compare`).
- `useMemo` autour des recalculs cantonaux dans `canton-compare.tsx` (qui recalcule à chaque keystroke aujourd'hui).

---

## Ordre d'exécution recommandé

Pour minimiser le risque de casse et te permettre de tester entre chaque :

1. **2.2** (badge "à rafraîchir") — 100% UI, 10 min
2. **2.3** (page de garde + sommaire PDF) — visuel, isolé
3. **3.1** (audit RLS) — read-only
4. **3.4** (logs PII) — suppression simple
5. **4.1 + 4.2** (validation + tooltips) — UI
6. **2.1** (versions de simulation) — touche la DB, à faire seul
7. **2.4** (export XLSX) — nouvelle feature isolée
8. **3.3** (validation Zod serveur) — par fonction, un par un
9. **4.3** (tests canton) — additif
10. **4.4** (perf) — en dernier, après stabilisation

## Ce que je NE fais PAS sans ton feu vert explicite

- Refonte du moteur de calcul fiscal cantonal (bloc 1b/1c du plan initial) → trop risqué sans suite de tests, je préfère faire 4.3 d'abord.
- Migration de schéma destructive.
- Changement des barèmes 2024 → 2025.

## Questions à clarifier avant de démarrer

1. Tu veux des rôles admin cross-broker (point 3.2) ou non ?
2. Pour 2.1 (versions), tu veux limiter à N versions par calculateur (ex: 10) ou illimité ?
3. Pour 2.3 (page de garde PDF), je prends les couleurs `pdf_primary_color` et `pdf_accent_color` déjà dans `profiles` — OK ?

Dis-moi par où on commence et je traite **un seul item à la fois**.
