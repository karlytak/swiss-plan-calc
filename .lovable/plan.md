## Plan global — 6 chantiers

### 1. Bug saisie virgules dans les champs % (rapide)

**Cause** : dans les wrappers locaux `NumField` (retirement.tsx, lpp.tsx, pillar3a.tsx, etc.), la valeur est stockée en `number` dans le state et re-sérialisée via `String(value)` à chaque keystroke. Quand l'utilisateur tape `5,` → normalize → `"5."` → `Number("5.") = 5` → state `5` → ré-affiché `"5"` → impossible d'ajouter une décimale.

**Correctif** : 
- Modifier le wrapper `NumField` (et les variantes locales dans chaque calculateur) pour conserver une **string locale tampon** (`useState<string>`) qui suit le state numérique parent uniquement quand il diverge réellement (hors focus).
- Approche plus simple : passer les % en `string` dans le form state des calculateurs (déjà le cas pour income-tax/source-tax via BaseNumField direct). Pour retirement et lpp, refactorer les champs taux pour stocker string et `parseFloat` au moment du calcul.

Fichiers : `src/routes/_app/calculators/{retirement,lpp,pillar3a,canton-compare,vested-benefits,avs-ai,cross-border,tou,director-compensation}.tsx`.

### 2. Lien Libre Passage → sfbvg.ch

Remplacer `https://www.zentralstelle.ch/fr/` par `https://sfbvg.ch/fr/` dans :
- `src/routes/_app/calculators/vested-benefits.tsx:130`
- `src/routes/_app/calculators/lpp.tsx:260`
- Clés i18n `calc.vested.search.cta` et `calc.lpp.search_tip_cta` dans `fr/de/en/it.ts` → texte "sfbvg.ch".

### 3. Logo cabinet uploadable + intégration PDF

**Backend** (migration) :
- Créer bucket Storage public `broker-logos`.
- RLS : insert/update/delete restreints à `auth.uid()::text = (storage.foldername(name))[1]`, select public.
- La colonne `logo_url` existe déjà dans `profiles`.

**UI** (`src/routes/_app/account.tsx`) :
- Section "Logo du cabinet" : upload PNG/JPG/SVG, max 2 Mo, preview, suppression.
- Upload vers `broker-logos/{userId}/logo.{ext}`, stocker l'URL publique dans `profiles.logo_url`.

**PDF** (`src/lib/pdf/builder.ts` + `useBrokerPdfHeader.ts`) :
- Charger l'image (fetch → base64) au moment de la génération PDF.
- `jsPDF.addImage()` en haut à gauche du header (40×40 px), nom du cabinet à droite du logo, couleurs personnalisées en arrière-plan inchangées.
- Si pas de logo : fallback texte seulement (comportement actuel).
- Gestion erreurs (logo manquant/inaccessible) : skip sans casser le PDF.

### 4. Refonte calcul impôt à la source (CRITIQUE)

**Problème** : `src/lib/tax/source.ts` applique un seul barème au salaire mensuel d'UNE personne. Pour un couple à 100k+80k, le revenu du conjoint est ignoré dans le calcul actuel.

**Diagnostic à confirmer** :
- Le barème `C` actuel n'agrège pas les revenus → résultat ~5 % au lieu de 12-15 %.
- Mapping marié/2 enfants → barème C2 absent (réductions enfants linéaires hardcodées).

**Refonte (`src/lib/tax/source.ts`)** :
- Nouvelle signature `computeSourceTax({ canton, scale, monthlyGross, spouseMonthlyGross?, children, church, isCrossBorderFR, deductions? })`.
- Si scale=C : calculer le **revenu mensuel combiné** = `monthlyGross + spouseMonthlyGross` (avec plafond conjoint GE = 5 925 CHF/mois selon barème C 2026), retenir le **taux** correspondant au combiné, l'appliquer au revenu propre du contribuable.
- Recalibrer les courbes barèmes A/B/C/H par régression sur les vrais barèmes ESTV 2026 (charger la grille officielle GE C0/C1/C2/C3 — au moins 20 points pour le C).
- Code enfants suffixé : C0 (0 enf), C1, C2, C3+ → réductions selon grille.
- Déductions 3a : impact uniquement via la **demande de TOU** (quasi-résidents) → ne pas baisser le brut mensuel utilisé pour le barème (les barèmes incluent déjà les forfaits).
- Retour : `{ rate, monthlyTax, annualTax, combinedMonthly, scaleUsed }`.

**UI source-tax** (`source-tax.tsx`) :
- Ajouter champ `spouseMonthlyGross` visible quand `scale === "C"`.
- Pré-rempli depuis `client.spouse_gross_annual_salary / 12` via `toSourceTaxInput`.
- Affichage du barème effectif (C2) et du revenu combiné dans les résultats.

**Mapping client→calculator** (`src/lib/clients/to-calculator-input.ts`) :
- `toSourceTaxInput` : passer `spouseMonthlyGross`, déduire `children = client.children.length`.
- `toIncomeTaxInput` : vérifier que le revenu conjoint est bien sommé pour le barème marié (déjà OK en théorie, mais re-tester).

**Comparateur cantonal** (`canton-compare.tsx` + `src/lib/tax/cantons.ts`) :
- Recalculer la charge fiscale annuelle avec le nouveau moteur.
- Vérifier le calcul "Impôt prestation LPP à la retraite" : confirmer formule (taux LPP cantonal × capital, séparé de l'IFD prestation).

### 5. Connexion calculateurs — taux marginal partagé

**Approche** : "Dernière simulation enregistrée" (choisi par l'utilisateur).

**Création** `src/hooks/useClientFiscalSnapshot.ts` :
- Input : `clientId`.
- Query Supabase : dernière `simulation_history` où `client_id = clientId AND kind IN ('income_tax','source_tax')` ordonné par `created_at DESC LIMIT 1`.
- Retourne `{ averageRate, marginalRateEstimate, lastUpdated, source }` ou `null`.
- `marginalRateEstimate = Math.min(averageRate + 5, 40)`.

**Intégration `retirement.tsx`** :
- Au montage, si `clientId` présent : charger snapshot. Si dispo, pré-remplir `rentMarginalRate` avec `marginalRateEstimate` (sauf si utilisateur a déjà modifié manuellement).
- Tooltip à côté du champ : « Le taux marginal correspond à l'impôt prélevé sur chaque franc supplémentaire de revenu… Estimé depuis la situation fiscale actuelle, ajustez selon vos hypothèses. »
- Sous la recommandation : « Cette comparaison repose sur les hypothèses ci-dessus (espérance de vie, rendement, fiscalité). Une modification de ces paramètres peut changer la recommandation. »
- Si pas de snapshot : valeur par défaut `25 %` + tooltip "hypothèse standard".

**Sauvegarder summary enrichi** : s'assurer que `SaveSimulationButton` pour income-tax/source-tax stocke bien `averageRate` dans `summary` (sinon ajouter).

### 6. Société — module "Rachats LPP du dirigeant"

**Nouveau** dans `src/routes/_app/calculators/director-compensation.tsx` :
- Section "Stratégie rachats LPP" après dividendes/salaire.
- Inputs : capacité de rachat (depuis client_pension), rachat annuel souhaité, horizon (1 an / 5 ans / jusqu'à retraite), age courant + age retraite (55 ou 65).
- Logique (`src/lib/director-compensation/index.ts`) :
  - Montant à sortir = rachat annuel + charges sociales évitées (le rachat se fait via salaire brut, pas dividende).
  - Économie d'impôt personnel = rachat × taux marginal (depuis snapshot).
  - Économie sur 5 ans / horizon retraite (cumul).
  - Comparaison vs dividende équivalent (impôt dividende ~70% imposé).
- Tableau récapitulatif : Année 1 / 5 ans / Total retraite avec montant sortie société / économie fiscale / capital LPP gagné.
- Tooltip explicatif + intégration dans le PDF director-compensation.

---

### Ordre d'implémentation

1. **Bug virgules %** + **lien sfbvg** (quick wins, 10 min).
2. **Refonte impôt source** + adaptation `source-tax.tsx` + `canton-compare.tsx` (chantier le plus long, le plus impactant).
3. **Snapshot fiscal partagé** + intégration retirement (taux marginal).
4. **Logo cabinet** : migration storage + UI account + intégration PDF.
5. **Module rachats LPP dirigeant** dans director-compensation.

Validation finale : tester le cas Genève marié 2 enfants 100k+80k → impôt source annuel attendu **~22-27k** (taux ~12-15 %).

### Fichiers impactés

- `supabase/migrations/...` (bucket broker-logos)
- `src/lib/tax/source.ts` (refonte complète)
- `src/lib/tax/cantons.ts` (cohérence comparateur)
- `src/lib/clients/to-calculator-input.ts` (mapping conjoint)
- `src/lib/director-compensation/index.ts` (+ types)
- `src/lib/pdf/builder.ts` (logo)
- `src/hooks/useBrokerPdfHeader.ts` (charger logo base64)
- `src/hooks/useClientFiscalSnapshot.ts` (NEW)
- `src/components/ui/num-field.tsx` ou wrappers locaux (fix virgule)
- `src/routes/_app/account.tsx` (upload logo)
- `src/routes/_app/calculators/{source-tax,retirement,canton-compare,director-compensation,vested-benefits,lpp}.tsx`
- `src/lib/i18n/{fr,de,en,it}.ts` (nouvelles clés tooltip + sfbvg)

GO ?