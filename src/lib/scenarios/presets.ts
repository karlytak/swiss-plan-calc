// Moteur de scénarios "what if" pour la fiche client.
// Construit un IncomeTaxInput baseline depuis le client et applique des variantes.

import type { Client, ClientPension, ClientAssets } from "@/lib/clients/types";
import { parseChildren } from "@/lib/clients/types";
import type { IncomeTaxInput } from "@/lib/tax/income";
import { PILLAR_3A_MAX_2026_LPP } from "@/lib/tax/income";

export type ScenarioId =
  | "baseline"
  | "marriage"
  | "divorce"
  | "new_child"
  | "max_3a"
  | "lpp_buyback_full"
  | "retirement_65"
  | "move_zg"
  | "move_sz"
  | "move_ge"
  | "move_vd"
  | "move_zh"
  | "raise_10"
  | "part_time_80";

export interface ScenarioDef {
  id: ScenarioId;
  label: string;
  description: string;
  category: "vie" | "fiscal" | "prevoyance" | "geo" | "carriere";
  apply: (base: IncomeTaxInput) => IncomeTaxInput;
}

export function clientToTaxInput(
  client: Client,
  pension: ClientPension | null,
  assets: ClientAssets | null,
): IncomeTaxInput {
  const children = parseChildren(client.children);
  const fortune =
    Number(assets?.bank_accounts ?? 0) +
    Number(assets?.securities ?? 0) +
    Number(assets?.real_estate_value ?? 0) -
    Number(assets?.mortgage_debt ?? 0);

  return {
    canton: client.canton ?? "VD",
    status:
      client.civil_status === "married" || client.civil_status === "registered_partnership"
        ? "married"
        : children.length > 0
          ? "single_with_children"
          : "single",
    confession:
      client.confession === "roman_catholic" || client.confession === "christian_catholic"
        ? "catholic"
        : client.confession === "protestant"
          ? "protestant"
          : client.confession === "none"
            ? "none"
            : "other",
    children: children.length,
    grossSalary: Number(client.gross_annual_salary ?? 0),
    spouseGrossSalary: Number(client.spouse_gross_annual_salary ?? 0),
    bonus: Number(client.bonus ?? 0),
    otherIncome: Number(client.other_income ?? 0),
    pillar3aContributions: Number(pension?.pillar_3a_annual_contribution ?? 0),
    mortgageInterest: Number(assets?.mortgage_interest ?? 0),
    realEstateMaintenance: Number(assets?.real_estate_maintenance ?? 0),
    netWealth: fortune,
  };
}

export const SCENARIO_PRESETS: ScenarioDef[] = [
  {
    id: "baseline",
    label: "Situation actuelle",
    description: "Référence · paramètres tels que dans la fiche client.",
    category: "vie",
    apply: (b) => ({ ...b }),
  },
  {
    id: "marriage",
    label: "Mariage",
    description: "Passage en imposition couple (splitting selon barème cantonal).",
    category: "vie",
    apply: (b) => ({ ...b, status: "married" }),
  },
  {
    id: "divorce",
    label: "Divorce",
    description: "Retour en célibataire, conjoint retiré.",
    category: "vie",
    apply: (b) => ({
      ...b,
      status: (b.children ?? 0) > 0 ? "single_with_children" : "single",
      spouseGrossSalary: 0,
    }),
  },
  {
    id: "new_child",
    label: "Naissance d'un enfant",
    description: "Ajout d'un enfant à charge (déduction sociale + barème famille).",
    category: "vie",
    apply: (b) => ({ ...b, children: (b.children ?? 0) + 1 }),
  },
  {
    id: "max_3a",
    label: "Versement 3a au plafond",
    description: `Cotisation portée à CHF ${PILLAR_3A_MAX_2026_LPP.toLocaleString("fr-CH")} (affilié LPP).`,
    category: "prevoyance",
    apply: (b) => ({ ...b, pillar3aContributions: PILLAR_3A_MAX_2026_LPP }),
  },
  {
    id: "lpp_buyback_full",
    label: "Rachat LPP (lacune complète)",
    description: "Versement de la capacité de rachat LPP en une fois.",
    category: "prevoyance",
    apply: (b) => ({
      ...b,
      // Rachat ajouté dynamiquement par l'appelant via lppBuyback
      lppBuyback: Math.max(0, b.lppBuyback ?? 0),
    }),
  },
  {
    id: "retirement_65",
    label: "Départ retraite ordinaire",
    description: "Salaire à 0, revenu rente AVS+LPP estimé à 60 % du dernier salaire.",
    category: "carriere",
    apply: (b) => {
      const lastSalary = (b.grossSalary ?? 0) + (b.bonus ?? 0);
      return {
        ...b,
        grossSalary: 0,
        bonus: 0,
        otherIncome: Math.round(lastSalary * 0.6),
        pillar3aContributions: 0,
        lppBuyback: 0,
      };
    },
  },
  {
    id: "move_zg",
    label: "Déménagement → Zoug",
    description: "Canton fiscalement parmi les plus avantageux de Suisse.",
    category: "geo",
    apply: (b) => ({ ...b, canton: "ZG", communalMultiplier: undefined, cantonalMultiplier: undefined }),
  },
  {
    id: "move_sz",
    label: "Déménagement → Schwytz",
    description: "Faible fiscalité cantonale, proche de Zurich.",
    category: "geo",
    apply: (b) => ({ ...b, canton: "SZ", communalMultiplier: undefined, cantonalMultiplier: undefined }),
  },
  {
    id: "move_ge",
    label: "Déménagement → Genève",
    description: "Comparatif avec un canton à fiscalité élevée.",
    category: "geo",
    apply: (b) => ({ ...b, canton: "GE", communalMultiplier: undefined, cantonalMultiplier: undefined }),
  },
  {
    id: "move_vd",
    label: "Déménagement → Vaud",
    description: "Lausanne et arc lémanique.",
    category: "geo",
    apply: (b) => ({ ...b, canton: "VD", communalMultiplier: undefined, cantonalMultiplier: undefined }),
  },
  {
    id: "move_zh",
    label: "Déménagement → Zurich",
    description: "Plus grand canton suisse.",
    category: "geo",
    apply: (b) => ({ ...b, canton: "ZH", communalMultiplier: undefined, cantonalMultiplier: undefined }),
  },
  {
    id: "raise_10",
    label: "Augmentation salaire +10 %",
    description: "Impact sur progressivité et taux marginal.",
    category: "carriere",
    apply: (b) => ({
      ...b,
      grossSalary: Math.round((b.grossSalary ?? 0) * 1.1),
      bonus: Math.round((b.bonus ?? 0) * 1.1),
    }),
  },
  {
    id: "part_time_80",
    label: "Passage à 80 %",
    description: "Réduction du salaire à 80 % du brut actuel.",
    category: "carriere",
    apply: (b) => ({
      ...b,
      grossSalary: Math.round((b.grossSalary ?? 0) * 0.8),
      bonus: Math.round((b.bonus ?? 0) * 0.8),
    }),
  },
];

export const SCENARIO_BY_ID: Record<ScenarioId, ScenarioDef> = Object.fromEntries(
  SCENARIO_PRESETS.map((s) => [s.id, s]),
) as Record<ScenarioId, ScenarioDef>;

export const CATEGORY_LABELS: Record<ScenarioDef["category"], string> = {
  vie: "Événements de vie",
  fiscal: "Fiscalité",
  prevoyance: "Prévoyance",
  geo: "Géographie",
  carriere: "Carrière",
};
