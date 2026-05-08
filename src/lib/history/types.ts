// Types pour l'historique des simulations sauvegardées.
export type SimulationKind =
  | "income_tax"
  | "source_tax"
  | "lpp"
  | "pillar3a"
  | "retirement"
  | "canton_compare";

export interface HistoryEntry {
  id: string;
  broker_id: string;
  client_id: string | null;
  kind: SimulationKind;
  title: string;
  note: string | null;
  inputs: Record<string, unknown>;
  summary: Record<string, unknown>;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface HistoryKpi {
  label: string;
  value: number | string;
  unit?: "CHF" | "%" | null;
}

import { t } from "@/lib/i18n";

const KIND_LABELS_FR: Record<SimulationKind, string> = {
  income_tax: "Impôt revenu & fortune",
  source_tax: "Impôt à la source",
  lpp: "LPP & rachats",
  pillar3a: "Pilier 3a",
  retirement: "Rente vs capital",
  canton_compare: "Comparateur cantonal",
};

// Proxy i18n : `KIND_LABELS[k]` reste valide partout, mais résout via t() au runtime.
export const KIND_LABELS: Record<SimulationKind, string> = new Proxy(KIND_LABELS_FR, {
  get(target, prop: string) {
    if (!(prop in target)) return (target as Record<string, string>)[prop];
    return t(`history.kind.${prop}`, undefined, (target as Record<string, string>)[prop]);
  },
}) as Record<SimulationKind, string>;

export const KIND_ROUTES: Record<SimulationKind, string> = {
  income_tax: "/calculators/income-tax",
  source_tax: "/calculators/source-tax",
  lpp: "/calculators/lpp",
  pillar3a: "/calculators/pillar3a",
  retirement: "/calculators/retirement",
  canton_compare: "/calculators/canton-compare",
};
