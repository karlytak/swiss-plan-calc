import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { NumField as BaseNumField } from "@/components/ui/num-field";
import { CalcCard, MoneyTile, StatTile, Row } from "@/components/calculators/CalcUI";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AVS_2026,
  getReferenceAge,
  projectAvsPension,
  type Gender,
} from "@/lib/avs";
import { GENDER_LABELS } from "@/lib/swiss/enums";
import {
  usePrefillFromClient,
  useHydrateFormFromPrefill,
} from "@/hooks/usePrefillFromClient";
import { ClientLinkBanner } from "@/components/calculators/ClientLinkBanner";

const searchSchema = z.object({
  clientId: fallback(z.string().uuid().optional(), undefined),
});

export const Route = createFileRoute("/_app/calculators/avs-ai")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Rente AVS/AI · SwissBroker Pro" },
      {
        name: "description",
        content:
          "Estimation de la rente AVS/AI 2026 (1er pilier) — couple, plafonnement, AVS21.",
      },
    ],
  }),
  component: AvsAiCalc,
});

function AvsAiCalc() {
  const currentYear = new Date().getFullYear();
  const { clientId } = Route.useSearch();
  const { client, prefill } = usePrefillFromClient(clientId, "avs-ai");

  const [form, setForm] = useState({
    // Personne 1
    birthYear: 1980,
    gender: "male" as Gender,
    contributionStartYear: 2003,
    retirementYear: 2045,
    averageAnnualIncome: 90_000,
    // Couple
    isCouple: false,
    spouseBirthYear: 1982,
    spouseGender: "female" as Gender,
    spouseContributionStartYear: 2005,
    spouseRetirementYear: 2046,
    spouseAverageAnnualIncome: 70_000,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useHydrateFormFromPrefill(prefill, setForm);

  const refAge = getReferenceAge(form.birthYear, form.gender);
  const refAgeSpouse = getReferenceAge(form.spouseBirthYear, form.spouseGender);

  const projection = useMemo(
    () =>
      projectAvsPension({
        status: form.isCouple ? "married" : "single",
        primary: {
          birthYear: form.birthYear,
          gender: form.gender,
          contributionStartYear: form.contributionStartYear,
          retirementYear: form.retirementYear,
          averageAnnualIncome: form.averageAnnualIncome,
        },
        spouse: form.isCouple
          ? {
              birthYear: form.spouseBirthYear,
              gender: form.spouseGender,
              contributionStartYear: form.spouseContributionStartYear,
              retirementYear: form.spouseRetirementYear,
              averageAnnualIncome: form.spouseAverageAnnualIncome,
            }
          : undefined,
      }),
    [form],
  );

  const ageAtRetirement = form.retirementYear - form.birthYear;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        {/* === PARAMÈTRES === */}
        <div className="space-y-4 md:col-span-3">
          <CalcCard
            title="Personne assurée"
            description={`Âge de référence AVS21 : ${refAge} ans (déterminé par genre + année de naissance).`}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <NumField
                label="Année de naissance"
                value={form.birthYear}
                onChange={(v) => set("birthYear", v)}
              />
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Genre</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => set("gender", v as Gender)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{GENDER_LABELS.male}</SelectItem>
                    <SelectItem value="female">{GENDER_LABELS.female}</SelectItem>
                    <SelectItem value="other">{GENDER_LABELS.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <NumField
                label="Année de début de cotisation"
                value={form.contributionStartYear}
                onChange={(v) => set("contributionStartYear", v)}
              />
              <NumField
                label="Année de retraite envisagée"
                value={form.retirementYear}
                onChange={(v) => set("retirementYear", v)}
              />
              <NumField
                label="Revenu annuel moyen carrière"
                value={form.averageAnnualIncome}
                onChange={(v) => set("averageAnnualIncome", v)}
                suffix="CHF"
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Année courante : {currentYear} · Âge à la retraite :{" "}
              <strong>{ageAtRetirement} ans</strong>
              {ageAtRetirement < AVS_2026.referenceAgeMin ||
              ageAtRetirement > AVS_2026.referenceAgeMax ? (
                <span className="ml-1 text-warning">
                  (hors fenêtre {AVS_2026.referenceAgeMin}–{AVS_2026.referenceAgeMax})
                </span>
              ) : null}
            </p>
          </CalcCard>

          <CalcCard title="Conjoint·e (optionnel)">
            <label className="mb-3 flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.isCouple}
                onCheckedChange={(v) => set("isCouple", Boolean(v))}
              />
              Calculer la rente de couple (plafonnement à {AVS_2026.maxCoupleMonthlyPension.toLocaleString("fr-CH")} CHF/mois)
            </label>
            {form.isCouple && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <NumField
                  label="Année de naissance"
                  value={form.spouseBirthYear}
                  onChange={(v) => set("spouseBirthYear", v)}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Genre</Label>
                  <Select
                    value={form.spouseGender}
                    onValueChange={(v) => set("spouseGender", v as Gender)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{GENDER_LABELS.male}</SelectItem>
                      <SelectItem value="female">{GENDER_LABELS.female}</SelectItem>
                      <SelectItem value="other">{GENDER_LABELS.other}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <NumField
                  label="Année de début de cotisation"
                  value={form.spouseContributionStartYear}
                  onChange={(v) => set("spouseContributionStartYear", v)}
                />
                <NumField
                  label="Année de retraite"
                  value={form.spouseRetirementYear}
                  onChange={(v) => set("spouseRetirementYear", v)}
                />
                <NumField
                  label="Revenu annuel moyen"
                  value={form.spouseAverageAnnualIncome}
                  onChange={(v) => set("spouseAverageAnnualIncome", v)}
                  suffix="CHF"
                />
                <p className="col-span-full text-xs text-muted-foreground">
                  Âge de référence conjoint·e : <strong>{refAgeSpouse} ans</strong>
                </p>
              </div>
            )}
          </CalcCard>
        </div>

        {/* === RÉSULTATS === */}
        <div className="space-y-4 md:col-span-2">
          <CalcCard title="Rente prévisionnelle" tilt>
            {form.isCouple && projection.combinedMonthlyPension !== undefined ? (
              <Row>
                <MoneyTile
                  label="Rente couple / mois"
                  value={projection.combinedMonthlyPension}
                  tone="primary"
                  big
                />
                <MoneyTile
                  label="Rente couple / an"
                  value={projection.combinedAnnualPension}
                  tone="success"
                />
              </Row>
            ) : (
              <Row>
                <MoneyTile
                  label="Rente / mois"
                  value={projection.primary.monthlyPension}
                  tone="primary"
                  big
                />
                <MoneyTile
                  label="Rente / an"
                  value={projection.primary.annualPension}
                  tone="success"
                />
              </Row>
            )}
            {projection.cappedCouple ? (
              <p className="mt-3 rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">
                ⚠️ Plafond couple appliqué (
                {AVS_2026.maxCoupleMonthlyPension.toLocaleString("fr-CH")} CHF/mois) —
                réduction proportionnelle des deux rentes individuelles.
              </p>
            ) : null}
          </CalcCard>

          <CalcCard title="Détail personne assurée">
            <Row>
              <StatTile
                label="Années cotisées"
                value={`${projection.primary.effectiveYears} / ${AVS_2026.fullContributionYears}`}
              />
              <StatTile
                label="Années manquantes"
                value={String(projection.primary.missingYears)}
                tone={projection.primary.missingYears > 0 ? "warning" : "default"}
              />
            </Row>
            <Row>
              <MoneyTile
                label="Rente complète théorique / an"
                value={projection.primary.theoreticalAnnualPension}
              />
              <StatTile
                label="Échelle"
                value={`${(projection.primary.reductionRatio * 100).toFixed(1)} %`}
                hint="Ratio années cotisées / 44"
              />
            </Row>
          </CalcCard>

          {form.isCouple && projection.spouse && (
            <CalcCard title="Détail conjoint·e">
              <Row>
                <StatTile
                  label="Années cotisées"
                  value={`${projection.spouse.effectiveYears} / ${AVS_2026.fullContributionYears}`}
                />
                <MoneyTile
                  label="Rente individuelle / mois"
                  value={projection.spouse.monthlyPension}
                />
              </Row>
            </CalcCard>
          )}
        </div>
      </div>

      <CalcCard title="Avertissement & limites du modèle">
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li>
            • Estimation basée sur les paramètres OFAS 2026 (rente min{" "}
            {AVS_2026.minMonthlyPension.toLocaleString("fr-CH")} CHF/mois, max{" "}
            {AVS_2026.maxMonthlyPension.toLocaleString("fr-CH")} CHF/mois).
          </li>
          <li>
            • Approximation par interpolation 2 segments — marge d'erreur ±3 % vs caisse de
            compensation.
          </li>
          <li>
            • Bonifications éducatives / d'assistance et splitting AVS officiel non modélisés.
          </li>
          <li>
            • <strong>Pour un calcul officiel : demander un Extrait de Compte Individuel
              (CI)</strong>{" "}
            auprès de la caisse cantonale.
          </li>
        </ul>
      </CalcCard>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <BaseNumField
        value={String(value)}
        onChange={(v) => onChange(Number(v) || 0)}
        suffix={suffix}
      />
    </div>
  );
}
