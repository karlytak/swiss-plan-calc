// Comparateur "Avant / Après" pour le Calculateur Fiscal Global.
//
// Logique :
// - Base de comparaison = snapshot figé du formulaire (capturé à l'ouverture
//   ou via le bouton "Définir comme base").
// - Situation simulée = formulaire actuel, en direct.
// - Le bloc affiche l'impact réel des modifications de l'utilisateur :
//   économie/surcoût d'impôt, charges santé, net annuel, taux effectif et
//   marginal. La liste des champs modifiés est affichée pour rendre
//   l'impact compréhensible.

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, RotateCcw } from "lucide-react";

import { CalcCard } from "@/components/calculators/CalcUI";
import {
  SplitCompareLayout,
  type SplitRow,
} from "@/components/calculators/SplitCompareLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCHF } from "@/lib/format";
import { computeTaxGlobal } from "@/lib/tax-global/engine";
import type { TaxGlobalInput, TaxGlobalResult } from "@/lib/tax-global/types";

interface Props {
  form: TaxGlobalInput;
  result: TaxGlobalResult;
  /** Identifiant client : si présent, la base est resynchronisée au changement. */
  clientId?: string;
}

// Champs numériques surveillés pour détecter une modification utilisateur.
const NUMERIC_FIELDS: Array<keyof TaxGlobalInput> = [
  "grossSalary",
  "bonus",
  "spouseGrossSalary",
  "otherIncome",
  "rentalIncome",
  "imputedRent",
  "foreignIncome",
  "netWealth",
  "pillar3aContributions",
  "pillar3bContributions",
  "lppBuyback",
  "mortgageInterest",
  "realEstateMaintenance",
  "healthInsurancePremiums",
  "childCareCosts",
  "donations",
  "children",
];

const CATEGORICAL_FIELDS: Array<keyof TaxGlobalInput> = [
  "canton",
  "countryOfResidence",
  "permit",
  "civilStatus",
  "confession",
  "spouseEmployed",
];

const FIELD_LABEL: Partial<Record<keyof TaxGlobalInput, string>> = {
  grossSalary: "Salaire brut",
  bonus: "Bonus",
  spouseGrossSalary: "Salaire brut conjoint",
  otherIncome: "Autres revenus",
  rentalIncome: "Revenus locatifs",
  imputedRent: "Valeur locative",
  foreignIncome: "Revenus étrangers",
  netWealth: "Fortune nette",
  pillar3aContributions: "3e pilier A",
  pillar3bContributions: "3e pilier B",
  lppBuyback: "Rachat LPP",
  mortgageInterest: "Intérêts hypothécaires",
  realEstateMaintenance: "Entretien immobilier",
  healthInsurancePremiums: "Primes santé",
  childCareCosts: "Frais de garde",
  donations: "Dons",
  children: "Nombre d'enfants",
  canton: "Canton",
  countryOfResidence: "Pays de résidence",
  permit: "Permis",
  civilStatus: "Statut civil",
  confession: "Confession",
  spouseEmployed: "Conjoint actif",
};

interface FieldDiff {
  key: keyof TaxGlobalInput;
  label: string;
  before: string;
  after: string;
  delta?: number;
}

function fmtVal(v: unknown): string {
  if (typeof v === "number") return formatCHF(v);
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  return String(v ?? "—");
}

function diffForms(base: TaxGlobalInput, curr: TaxGlobalInput): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  for (const k of NUMERIC_FIELDS) {
    const a = Number(base[k] ?? 0);
    const b = Number(curr[k] ?? 0);
    if (a !== b) {
      diffs.push({
        key: k,
        label: FIELD_LABEL[k] ?? String(k),
        before: fmtVal(a),
        after: fmtVal(b),
        delta: b - a,
      });
    }
  }
  for (const k of CATEGORICAL_FIELDS) {
    if (base[k] !== curr[k]) {
      diffs.push({
        key: k,
        label: FIELD_LABEL[k] ?? String(k),
        before: fmtVal(base[k]),
        after: fmtVal(curr[k]),
      });
    }
  }
  return diffs;
}

export function TaxGlobalCompareCard({ form, result, clientId }: Props) {
  // Base de comparaison : snapshot initial du formulaire.
  const [baseline, setBaseline] = useState<TaxGlobalInput>(form);
  const initializedRef = useRef(false);
  const lastClientRef = useRef<string | undefined>(clientId);

  // Resynchroniser la base lorsqu'on change de client (prefill).
  useEffect(() => {
    if (lastClientRef.current !== clientId) {
      lastClientRef.current = clientId;
      setBaseline(form);
      initializedRef.current = true;
      return;
    }
    // Première hydratation : si la base est encore le default et le form a été
    // peuplé par le prefill, on resynchronise une seule fois.
    if (!initializedRef.current) {
      setBaseline(form);
      initializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, form.grossSalary, form.canton, form.permit, form.civilStatus]);

  const baselineResult = useMemo(() => computeTaxGlobal(baseline), [baseline]);

  const diffs = useMemo(() => diffForms(baseline, form), [baseline, form]);
  const hasChanges = diffs.length > 0;

  const ifdRow = (r: TaxGlobalResult): number =>
    r.income ? r.income.ifd : r.crossBorder?.swissTax ?? r.source?.annualTax ?? 0;
  const cantonalRow = (r: TaxGlobalResult): number =>
    r.income ? r.income.cantonal + r.income.communal : 0;
  const wealthRow = (r: TaxGlobalResult): number => r.income?.wealthTax ?? 0;

  const rows: SplitRow[] = [
    {
      label: "Impôt total annuel",
      current: baselineResult.totalTaxCHF,
      projected: result.totalTaxCHF,
      betterWhen: "lower",
    },
    {
      label: "Impôt fédéral / source CH",
      current: ifdRow(baselineResult),
      projected: ifdRow(result),
      betterWhen: "lower",
    },
    ...(cantonalRow(baselineResult) > 0 || cantonalRow(result) > 0
      ? [
          {
            label: "Cantonal + communal",
            current: cantonalRow(baselineResult),
            projected: cantonalRow(result),
            betterWhen: "lower" as const,
          },
        ]
      : []),
    ...(wealthRow(baselineResult) > 0 || wealthRow(result) > 0
      ? [
          {
            label: "Impôt sur la fortune",
            current: wealthRow(baselineResult),
            projected: wealthRow(result),
            betterWhen: "lower" as const,
          },
        ]
      : []),
    ...(baselineResult.socialChargesCHF > 0 || result.socialChargesCHF > 0
      ? [
          {
            label: "Charges santé (LAMal / CMU)",
            current: baselineResult.socialChargesCHF,
            projected: result.socialChargesCHF,
            betterWhen: "lower" as const,
          },
        ]
      : []),
    {
      label: "Net annuel disponible",
      current: baselineResult.netAnnualCHF,
      projected: result.netAnnualCHF,
      betterWhen: "higher",
    },
    {
      label: "Taux effectif",
      current: baselineResult.effectiveRate / 100,
      projected: result.effectiveRate / 100,
      format: "pct",
      betterWhen: "lower",
    },
    {
      label: "Taux marginal",
      current: baselineResult.marginalRate / 100,
      projected: result.marginalRate / 100,
      format: "pct",
      betterWhen: "lower",
    },
  ];

  const annualSaving = baselineResult.totalTaxCHF - result.totalTaxCHF;
  const netGain = result.netAnnualCHF - baselineResult.netAnnualCHF;
  const deltaPct =
    baselineResult.totalTaxCHF > 0
      ? annualSaving / baselineResult.totalTaxCHF
      : 0;

  const regimeChanged = baselineResult.regime !== result.regime;
  const noEffect = result.regime === "cross_border_fr_1983";
  const needsTou =
    result.regime === "source_taxed" ||
    result.regime === "cross_border_ge" ||
    result.regime === "cross_border_other";

  return (
    <CalcCard title="Comparateur fiscal · Avant / Après">
      <p className="mb-3 text-xs text-muted-foreground">
        Comparez la situation de référence (base figée) avec la situation
        simulée en direct. Toute modification du formulaire (rachat LPP, 3a,
        canton, permis, statut, frontalier…) fait bouger la colonne « Après ».
      </p>

      {/* Barre d'actions base */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setBaseline(form)}
          className="gap-1.5"
        >
          <Camera className="h-3.5 w-3.5" />
          Définir comme base
        </Button>
        {hasChanges && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setBaseline(form)}
            className="gap-1.5 text-muted-foreground"
            title="Réinitialiser la base sur les valeurs actuelles"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser la base
          </Button>
        )}
        <Badge variant="outline" className="ml-auto text-[10px]">
          {hasChanges
            ? `${diffs.length} modification${diffs.length > 1 ? "s" : ""} simulée${diffs.length > 1 ? "s" : ""}`
            : "Aucune modification simulée"}
        </Badge>
      </div>

      {/* Liste des changements */}
      {hasChanges ? (
        <div className="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="mb-2 text-xs font-semibold text-primary">
            Changements simulés
          </div>
          <ul className="space-y-1 text-xs">
            {diffs.map((d) => (
              <li key={String(d.key)} className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium text-foreground">{d.label} :</span>
                <span className="text-muted-foreground line-through">{d.before}</span>
                <span className="text-foreground">→ {d.after}</span>
                {typeof d.delta === "number" && d.delta !== 0 && (
                  <span
                    className={
                      d.delta > 0
                        ? "rounded bg-success/15 px-1.5 text-[10px] font-semibold text-success"
                        : "rounded bg-destructive/15 px-1.5 text-[10px] font-semibold text-destructive"
                    }
                  >
                    {d.delta > 0 ? "+" : "−"}
                    {formatCHF(Math.abs(d.delta))}
                  </span>
                )}
              </li>
            ))}
            {regimeChanged && (
              <li className="flex flex-wrap items-baseline gap-2 pt-1">
                <span className="font-medium text-foreground">Régime fiscal :</span>
                <span className="text-muted-foreground line-through">
                  {baselineResult.regimeLabel}
                </span>
                <span className="text-foreground">→ {result.regimeLabel}</span>
              </li>
            )}
          </ul>
        </div>
      ) : (
        <div className="mb-4 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Aucune modification simulée. Modifiez un champ du formulaire (rachat
          LPP, 3a, canton, permis…) ou appliquez une optimisation détectée pour
          voir son impact ici.
        </div>
      )}

      {needsTou && hasChanges && (
        <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300">
          <strong>Démarche requise.</strong> Pour matérialiser l'économie il
          faut demander la TOU (quasi-résident, 90 % des revenus en CH) ou une
          rectification IS auprès de l'AFC avant le 31 mars de l'année
          suivante. Sans démarche, la retenue à la source brute s'applique.
        </div>
      )}
      {noEffect && hasChanges && (
        <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          <strong>Accord 1983.</strong> Imposition exclusive en France. Les
          déductions suisses (3a, rachat LPP, primes LAMal CH) n'ont aucun
          effet fiscal. L'écart affiché est informatif.
        </div>
      )}

      <SplitCompareLayout
        currentLabel="Avant modification"
        projectedLabel="Après modification"
        currentSubtitle="Base de comparaison (figée)"
        projectedSubtitle="Situation simulée en direct"
        rows={rows}
        legend={
          <span>
            Pastille verte : économie ou amélioration. Pastille rouge :
            surcoût. Pas de pastille = pas de changement.
          </span>
        }
        summary={{
          annualSaving,
          annualSavingLabel: "Économie d'impôt annuelle",
          retirementGain: netGain,
          retirementGainLabel: "Gain net annuel (cash en poche)",
          deltaPercent: deltaPct,
          deltaLabel: "Variation d'impôt",
          footnote: hasChanges ? (
            <span>
              Impact basé sur {diffs.length} modification
              {diffs.length > 1 ? "s" : ""} :{" "}
              {diffs
                .map((d) =>
                  typeof d.delta === "number" && d.delta !== 0
                    ? `${d.label} ${d.delta > 0 ? "+" : "−"}${formatCHF(Math.abs(d.delta))}`
                    : `${d.label} (${d.before} → ${d.after})`,
                )
                .join(", ")}
              .
            </span>
          ) : (
            <span>
              Les deux colonnes sont identiques tant qu'aucune modification
              n'est saisie.
            </span>
          ),
        }}
      />

      {hasChanges && Math.abs(annualSaving) < 100 && (
        <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-xs">
          <div className="mb-1.5 font-semibold text-foreground">
            Pourquoi l'impôt ne bouge presque pas malgré la modification ?
          </div>
          <ul className="space-y-1 text-muted-foreground">
            {noEffect && (
              <li>
                • Accord franco-suisse 1983 : les déductions CH ne sont pas
                opposables au fisc français. L'impôt CH reste inchangé.
              </li>
            )}
            {needsTou && (
              <li>
                • Régime à la source sans TOU : la retenue brute s'applique et
                les déductions n'ont pas d'effet automatique. L'économie ne se
                matérialise qu'après dépôt de la demande à l'AFC.
              </li>
            )}
            {result.regime === "source_taxed" &&
              result.touComparison &&
              result.touComparison.ordinaryTax >=
                (result.source?.annualTax ?? 0) && (
                <li>
                  • La taxation ordinaire avec déductions reste plus coûteuse
                  que la retenue à la source : la TOU n'apporte rien ici.
                </li>
              )}
            {diffs.some((d) => d.key === "lppBuyback") &&
              (form.lppBuybackCapacity ?? 0) === 0 && (
                <li>
                  • Capacité de rachat LPP non renseignée sur la fiche client :
                  un rachat saisi peut être ignoré ou plafonné.
                </li>
              )}
            <li className="pt-1 text-foreground/70">
              Astuce : la modification peut affecter uniquement les charges
              santé, le net cash ou le taux marginal sans déplacer l'impôt
              total. Vérifiez chaque ligne du comparateur ci-dessus.
            </li>
          </ul>
        </div>
      )}
    </CalcCard>
  );
}
