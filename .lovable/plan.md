
# SwissBroker Pro — Calculateur prévoyance & optimisation fiscale

Outil SaaS ultra-moderne pour courtiers suisses. Inscription libre (gratuit en v1, monétisable plus tard), couverture nationale (26 cantons + frontaliers), moteur de calcul exhaustif et suggestions d'optimisation contextuelles.

## 1. Accès & comptes courtiers

- Inscription/connexion email + mot de passe + Google (Lovable Cloud).
- Profil courtier : nom, cabinet, logo (utilisé pour les exports PDF), téléphone, email pro.
- Pas de rôles complexes en v1 : chaque courtier a son propre espace, ses dossiers privés.
- Architecture prête pour passage payant ultérieur (table `subscriptions`, gating de fonctions premium activable plus tard sans refonte).

## 2. Dossiers clients (CRM léger)

Liste, recherche, fiche client avec onglets :
- **Identité** : état civil (célibataire / marié / partenariat / divorcé / veuf), date de naissance, confession (impôt ecclésiastique), enfants à charge avec dates de naissance.
- **Statut fiscal** : résident ordinaire, imposé à la source (permis B/L/Ci/F), frontalier G (accord France-Suisse 4,5 % ou imposition cantonale), quasi-résident (TOU possible), non assujetti.
- **Domicile** : canton + commune (multiplicateur communal exact) + paroisse.
- **Profession & revenus** : salarié / indépendant / mixte, taux d'activité, salaire brut, bonus, revenus accessoires, double activité, conjoint (revenus, prévoyance).
- **Patrimoine** : comptes bancaires, titres, immobilier (résidence principale avec valeur locative, immeubles de rendement), véhicules, objets de valeur, dettes (hypothèques, crédits).
- **Prévoyance** : certificats LPP (avoir vieillesse, salaire assuré, déduction de coordination, plan, taux de conversion), comptes de libre passage, comptes 3a (avec institutions et soldes), 3b (assurances vie), rachats LPP déjà effectués, retraits anticipés (logement, indépendance).
- **Documents** : upload certificats, avis de taxation, contrats.
- **Historique simulations** & notes libres.

## 3. Moteur de calcul — exhaustivité

Modules TypeScript purs côté serveur, données fiscales versionnées par année et canton.

### Fiscalité — tout ce qui est calculable

- **IFD** : barème célibataire / marié, splitting, déductions enfants/formation.
- **ICC** des 26 cantons : barème de base + coefficient cantonal + coefficient communal + impôt ecclésiastique (catholique romain / protestant / catholique chrétien selon canton et confession).
- **Impôt sur la fortune** cantonal et communal (barème par canton, déduction sociale par état civil et enfants).
- **Impôt à la source** : barèmes A0–A6, B0–B6, C0–C6, H0–H6, F (frontaliers IT), L (quasi-résidents), avec barèmes propres à chaque canton.
- **Frontaliers** :
  - Accord France-Suisse : retenue 4,5 % cantons GE, BE, BS, BL, JU, NE, SO, VD, VS (rétrocession au pays de résidence).
  - Genève : régime spécifique (imposition à la source genevoise pour résidents français travaillant à Genève).
  - Tessin : accord Italie.
  - Comparatif net pour le client selon son canton de travail.
- **Quasi-résident & TOU** (Taxation Ordinaire Ultérieure) : éligibilité (>90 % revenus en Suisse), comparatif IS retenue vs TOU, recommandation.
- **Impôt sur prestation en capital** (LPP/3a) : barème séparé propre à chaque canton + IFD, calcul de la fragmentation optimale.
- **Impôt sur les gains immobiliers** (par canton, dégressif selon durée de détention).
- **Droits de mutation, taxe foncière, valeur locative** (par canton).
- **Déductions exhaustives** : frais professionnels (forfait/effectifs), repas, transport, perfectionnement, frais de garde, primes maladie/accidents, intérêts dette, pension alimentaire, double activité, 3a, rachats LPP, dons, frais médicaux, handicap.
- **Calcul du taux marginal d'imposition** (clé pour évaluer toute économie fiscale).

### 2e pilier (LPP) — complet

- Lecture/saisie certificat : avoir actuel, salaire assuré, déduction de coordination, plan (obligatoire / surobligatoire / cadres), taux de conversion réglementaire.
- Projection avoir au départ retraite avec bonifications par tranche d'âge (7/10/15/18 %) et intérêts composés (taux réglementaire vs surobligatoire).
- **Rachats LPP** : calcul de la lacune maximale, étalement optimal sur N années pour maximiser l'économie fiscale (éviter de descendre sous palier de progression), respect du délai de 3 ans avant retrait en capital.
- **Retraite** :
  - Rente viagère (imposée 100 % au revenu).
  - Capital (impôt sur prestation en capital, barème séparé).
  - Mixte (rente + capital partiel) avec optimisation du ratio.
- **Retrait anticipé** : achat logement (EPL), départ à l'étranger, indépendance — calcul du coût fiscal et de l'impact retraite.
- **Libre passage** : comparatif stratégies (sécurité 0–25 %, équilibre 25–50 %, dynamique 50–80 % actions), projection nette de frais et d'impôts, fragmentation sur plusieurs comptes.
- **Lacunes de prévoyance** : calcul du déficit pour maintenir le niveau de vie à la retraite (règle des 80 %).

### 3e pilier (3a / 3b)

- Plafonds annuels : salarié affilié LPP, indépendant sans LPP (20 % du revenu net, max légal).
- Économie fiscale annuelle = versement × taux marginal (IFD + ICC + commune + église).
- Projection capital sur 10/20/30/40 ans avec rendement paramétrable (banque ou fonds 3a, allocation actions personnalisable).
- **Stratégie de retrait échelonné** : ouverture de plusieurs comptes 3a pour casser la progressivité de l'impôt sur prestation en capital (recommandation du nombre optimal de comptes selon le canton et le capital projeté).
- **EPL 3a** : retrait pour résidence principale, calcul fiscal.
- **3b** : assurance-vie liée/non liée, traitement fiscal différent.

### Comparateur de scénarios

Le courtier crée plusieurs scénarios sur un même client :
- Mariage / divorce / partenariat enregistré.
- Naissance d'un enfant.
- Déménagement intercantonal (avec tableau comparatif des 26 cantons + ranking des plus avantageux pour le profil).
- Changement de taux d'activité ou de salaire.
- Démarrage / cessation d'activité indépendante.
- Achat immobilier (avec usage LPP/3a, valeur locative, frais d'entretien, intérêts hypothécaires, amortissement direct vs indirect via 3a).
- Départ à la retraite (anticipé, ordinaire, ajourné) avec optimisation rente/capital.
- Rachat LPP planifié sur N années.
- Stratégie de placement libre passage.

Vue côte à côte : revenu net, impôts détaillés, capital prévoyance projeté, patrimoine net, deltas chiffrés et %, graphiques de projection.

## 4. Suggestions d'optimisation contextuelles (différenciateur)

Moteur de règles qui analyse la fiche client et affiche automatiquement des recommandations ciblées, par exemple :

- "Capacité de rachat LPP : 47 200 CHF. Économie fiscale estimée à votre taux marginal (32 %) : ~15 100 CHF. Étalement recommandé sur 3 ans pour rester sous le palier de progression."
- "Vous ne versez pas le maximum 3a (versé 4 800 / plafond 7 258). Versement complémentaire : économie fiscale ~790 CHF cette année."
- "Capital LPP projeté à 65 ans : 612 000 CHF. Retrait sur un seul compte : impôt ~58 000 CHF. Fragmentation sur 3 comptes 3a + capital LPP étalé sur 3 ans : impôt ~34 000 CHF (économie 24 000 CHF)."
- "Frontalier français travaillant à Genève : votre situation est optimisée par le régime IS genevois ; vérifier l'éligibilité TOU si déductions élevées (intérêts emprunt résidence principale)."
- "Déménagement Genève → Zoug : économie fiscale annuelle estimée ~12 400 CHF à revenu constant."
- "Indépendant sans LPP : ouverture d'un 2e pilier facultatif possible — comparatif vs 3a maximal (20 % revenu)."
- "Couple marié, conjoint sans revenu : envisager le splitting via activité indépendante / société pour optimiser la progressivité."
- "Lacune prévoyance : 380 000 CHF pour maintenir 80 % du niveau de vie à 65 ans. Plan d'épargne 3a + rachat LPP recommandé."

Chaque suggestion est : chiffrée, justifiée, cliquable pour générer le scénario correspondant en un clic.

## 5. Calculateurs rapides (sans dossier)

Accessibles depuis le dashboard, pour une simulation flash :
- Impôts revenu + fortune (par canton/commune).
- Impôt à la source (frontalier ou permis B).
- Impôt sur prestation en capital LPP/3a.
- Économie fiscale rachat LPP.
- Économie fiscale 3a.
- Comparateur cantonal (entrer un revenu, voir le classement des 26 cantons).
- Rente vs capital LPP.
- Projection 3a (rendement composé).

## 6. Données fiscales

Tables versionnées par `tax_year` :
- Barèmes IFD (revenu, prestation en capital).
- Barèmes ICC par canton (revenu, fortune, prestation en capital, gains immobiliers).
- Coefficients cantonaux et communaux annuels.
- Barèmes impôt à la source par canton (A/B/C/H, avec et sans enfants).
- Paramètres LPP (déduction de coordination, salaire min/max, bonifications, taux d'intérêt minimal).
- Plafonds 3a (avec/sans 2e pilier).
- Taux d'impôt ecclésiastique par canton et confession.

Page admin (réservée à l'équipe produit) pour mise à jour annuelle des barèmes (import CSV ou édition formulaire). Sources : AFC, AFF, administrations cantonales — chaque jeu de données horodaté avec source.

## 7. Livrables

- **Rapport PDF brandé cabinet** : page de garde avec logo, infos client, scénarios comparés, graphiques, tableau des optimisations recommandées avec chiffrage, recommandations rédigées par le courtier.
- **Export Excel** des calculs détaillés.
- **Tableaux comparatifs** & graphiques interactifs (Recharts) en ligne.

## 8. Design — moderne 2026, responsive

- Interface dense mais épurée, sidebar rétractable, dark mode + light mode.
- Layouts responsives mobile/tablette/desktop ; les courtiers consultent souvent en rendez-vous client sur tablette.
- Composants shadcn/ui, animations subtiles (framer-motion), micro-interactions.
- Saisie rapide : raccourcis clavier, autocomplétion communes, presets de profils types.
- Résultats temps réel pendant la saisie (calculs instantanés côté serveur).
- Graphiques interactifs (hover, drill-down, comparaison de courbes).
- Accessibilité (contrastes, navigation clavier, lecteurs d'écran).

## 9. Architecture des pages

```
/                       → Landing publique (présentation outil, CTA inscription)
/auth                   → Login / inscription (email + Google)
/dashboard              → Synthèse : clients récents, KPIs, accès calculateurs rapides
/clients                → Liste + recherche + filtres
/clients/new            → Création dossier (formulaire multi-étapes)
/clients/$id            → Fiche client (onglets)
/clients/$id/simulate   → Nouvelle simulation
/clients/$id/scenarios/$sid → Détail scénario + comparateur
/calculators            → Liste calculateurs rapides
/calculators/$type      → Calculateur spécifique
/account                → Profil + branding cabinet (logo PDF)
```

## 10. Découpage de livraison

**Phase 1 — Fondations** : auth (email + Google), dashboard, fiche client complète, schéma BDD, seed barèmes 2025 prioritaires (cantons les plus peuplés : ZH, BE, VD, GE, AG, SG + tous les cantons frontaliers).

**Phase 2 — Moteur fiscal** : impôts ordinaires (IFD + ICC + fortune) tous cantons, impôt à la source complet (A/B/C/H + frontaliers + TOU), impôt sur prestation en capital, calculateurs rapides.

**Phase 3 — Prévoyance** : 2e pilier (rachats, retraite rente/capital/mixte, retrait anticipé, libre passage), 3e pilier (économie + projection rendement + retrait échelonné), lacunes de prévoyance.

**Phase 4 — Optimisation & livrables** : moteur de suggestions d'optimisation contextuelles, comparateur multi-scénarios, comparateur cantonal, génération PDF brandée, export Excel.

## Détails techniques

- Stack : TanStack Start + React + Tailwind + shadcn/ui + Recharts + framer-motion + Zod + react-hook-form + @react-pdf/renderer + ExcelJS.
- Backend : Lovable Cloud (Postgres + Auth + RLS + Storage logos/documents).
- Calculs côté serveur via `createServerFn` (modules purs `src/lib/tax/*`, `src/lib/lpp/*`, `src/lib/pillar3/*`, `src/lib/optimizer/*`), entièrement testables.
- RLS stricte : chaque courtier ne voit que ses dossiers.
- Versionnage des barèmes par `tax_year` pour reproductibilité des simulations passées.
- Validation Zod systématique côté serveur.
- Sources de données fiscales documentées dans le code (références AFC + administrations cantonales) pour traçabilité et mise à jour annuelle.

## Précision des chiffres — engagement

Les barèmes saisis seront ceux publiés officiellement (AFC pour IFD, administrations cantonales pour ICC/IS). Les calculs respecteront la mécanique légale : arrondis, paliers, splitting marié, déduction sociale fortune, multiplicateurs successifs. Tous les montants seront sourcés et l'année fiscale clairement affichée. Le courtier reste responsable de la validation avant remise au client (mention figurera dans les exports PDF).

## Hors v1 (évolutions futures)

- Passage payant : abonnements (Stripe), gating de fonctionnalités premium (multi-cantons illimités, export PDF brandé, suggestions d'optimisation avancées).
- Multi-langue (DE / IT).
- Portail client connecté.
- Signature électronique des rapports.
- API publique pour intégrations CRM tiers.
- Import automatique de certificats LPP (OCR PDF).
