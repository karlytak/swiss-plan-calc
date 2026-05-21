
## Réponses aux 2 questions

### 1. D'où viennent les 20'000 CHF de rachat LPP dans le comparateur de scénarios ?

**Ce ne sont PAS les données de la fiche client.** C'est une **simulation hardcodée** dans `src/lib/tax-global/scenarios.ts` ligne 59 :

```ts
const buybackTrial = 20_000;          // valeur fixe pour TOUS les clients
if (!isFrAccord1983 && input.lppBuyback < buybackTrial) {
  const r = computeTaxGlobal({ ...input, lppBuyback: buybackTrial });
  out.push({ label: `+Rachat LPP 20'000 CHF`, ... });
}
```

Le moteur prend le baseline (qui lui contient bien le rachat de la fiche client via `to-calculator-input.ts`) et ajoute **arbitrairement 20'000 CHF** pour montrer un scénario "et si je rachetais 20k ?". C'est un cas-école, pas une recommandation calibrée sur le client.

**Le vrai souci** : la capacité de rachat LPP du client (`lpp_max_buyback`) est déjà connue (champ `lppBuybackCapacity` dans le profil), mais le scénario l'ignore et propose toujours 20k.

**Correctif proposé** :
- Remplacer la constante par `Math.min(20_000, lppBuybackCapacity ?? 20_000)` quand la capacité existe, sinon proposer 3 paliers (5k / 20k / capacité max).
- Renommer le label en `+Rachat LPP <X> CHF (capacité dispo : Y)` pour rendre l'origine du chiffre transparente.
- Ajouter une tooltip sur le scénario : *"Simulation théorique. Capacité de rachat reprise de la fiche client (lpp_max_buyback). Modifiable dans Optimisations & déductions."*

### 2. Le calculateur "Réclamation taux de change" trouve-t-il le bon taux par année antérieure ?

**Oui, en partie — voici exactement comment :**

**Taux AFC (officiel suisse, annuel)** — `src/lib/fx/sources.ts` :
```ts
AFC_ANNUAL_RATES = {
  2020: { EUR: 1.0705, USD: 0.9395, GBP: 1.2050 },
  2021: { EUR: 1.0811, USD: 0.9145, GBP: 1.2576 },
  2022: { EUR: 1.0047, USD: 0.9558, GBP: 1.1812 },
  2023: { EUR: 0.9716, USD: 0.8984, GBP: 1.1175 },
  2024: { EUR: 0.9518, USD: 0.8800, GBP: 1.1230 },
  2025: { EUR: 0.9376, USD: 0.8500, GBP: 1.1100 },
}
```
→ Dès que tu changes l'année dans le menu, le taux AFC correspondant s'affiche automatiquement (EUR/USD/GBP). Couverture : **2020 → 2025 uniquement**.

**Taux marché (BNS/ECB, journalier)** — bouton **"Taux BNS/ECB"** :
- Appelle `fetchMarketRates` (server function) qui interroge `api.frankfurter.app` (proxy ECB gratuit)
- Récupère le taux à la **date exacte** de chaque versement listé
- Remplit automatiquement la colonne "Taux BNS/ECB" de chaque ligne
- Affiche un toast si certaines dates n'ont pas pu être récupérées (week-end, jour férié → fallback manuel)

**Limites actuelles** :
1. AFC ne couvre pas les années < 2020 ni 2026+ (à compléter quand publié).
2. CAD, JPY, AUD ne sont pas dans la table — uniquement EUR/USD/GBP.
3. Pas de fallback automatique BNS si Frankfurter échoue.

**Améliorations proposées** :
- Ajouter années **2017-2019** (rétroactif jusqu'à 5 ans = délai de prescription FR/CH).
- Ajouter **CAD, JPY** au minimum (frontaliers, expatriés).
- En cas d'échec Frankfurter, basculer sur **data.snb.ch** (BNS officielle) comme source secondaire.
- Si la date tombe un week-end, prendre automatiquement le vendredi précédent (déjà standard fiscal).

## Récap fichiers à modifier

| Fichier | Changement |
|---|---|
| `src/lib/tax-global/scenarios.ts` | Scénario rachat LPP basé sur `lppBuybackCapacity`, label transparent |
| `src/lib/fx/sources.ts` | Ajouter années 2017-2019, devises CAD/JPY |
| `src/lib/fx/fetch.functions.ts` | Fallback BNS + repli vendredi précédent si week-end |
| `src/routes/_app/calculators/fx-claim.tsx` | Badge "Taux AFC officiel <année>" + warning si année hors table |

Confirme et j'applique.
