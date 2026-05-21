// Carte « Prestations consolidées » — addition automatique 1er + 2e pilier
// par événement (vieillesse, invalidité, décès) à partir de la fiche client.

import { useMemo, useState } from "react";
import { HeartHandshake, ShieldAlert, Cross } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCHF } from "@/lib/format";
import {
  consolidatePensionBenefits,
  PENSION_EVENT_LABELS,
  type ConsolidatedScenario,
  type PensionEvent,
} from "@/lib/pension-consolidation";
import type { ClientBundle } from "@/lib/client-dashboard";

interface Props {
  bundle: ClientBundle;
}

const EVENT_ICONS: Record<PensionEvent, typeof HeartHandshake> = {
  retirement: HeartHandshake,
  disability: ShieldAlert,
  death: Cross,
};

export function ConsolidatedBenefitsCard({ bundle }: Props) {
  const benefits = useMemo(() => consolidatePensionBenefits(bundle), [bundle]);
  const [tab, setTab] = useState<PensionEvent>("retirement");

  return (
    <DashboardCard title="Prestations consolidées 1er + 2e pilier" icon={HeartHandshake}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as PensionEvent)}>
        <TabsList className="grid w-full grid-cols-3">
          {(Object.keys(PENSION_EVENT_LABELS) as PensionEvent[]).map((ev) => {
            const Icon = EVENT_ICONS[ev];
            return (
              <TabsTrigger key={ev} value={ev} className="text-xs">
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {PENSION_EVENT_LABELS[ev]}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {(Object.keys(PENSION_EVENT_LABELS) as PensionEvent[]).map((ev) => (
          <TabsContent key={ev} value={ev} className="mt-3">
            <ScenarioPanel scenario={benefits[ev]} />
          </TabsContent>
        ))}
      </Tabs>
    </DashboardCard>
  );
}

function ScenarioPanel({ scenario }: { scenario: ConsolidatedScenario | null }) {
  if (!scenario) {
    return (
      <p className="text-xs text-muted-foreground">
        Données insuffisantes (date de naissance, salaire ou avoirs manquants).
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-primary/5 p-3 text-center">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Total mensuel consolidé
        </p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
          {formatCHF(scenario.combinedMonthly)}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {formatCHF(scenario.combinedAnnual)} / an
        </p>
      </div>

      <PillarBlock title="1er pilier (AVS / AI)" total={scenario.pillar1.totalAnnual} items={scenario.pillar1.items} />
      <PillarBlock title="2e pilier (LPP)" total={scenario.pillar2.totalAnnual} items={scenario.pillar2.items} />

      {scenario.notes.length > 0 && (
        <ul className="space-y-0.5 rounded-md bg-muted/40 p-2 text-[10px] text-muted-foreground">
          {scenario.notes.map((n, i) => (
            <li key={i}>• {n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PillarBlock({
  title,
  total,
  items,
}: {
  title: string;
  total: number;
  items: { label: string; annual: number; monthly: number }[];
}) {
  return (
    <div className="rounded-md border border-border/60 p-2">
      <div className="flex items-center justify-between border-b border-border/40 pb-1">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <span className="text-xs font-semibold tabular-nums text-primary">
          {formatCHF(total)} / an
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-1 text-[11px] text-muted-foreground">Aucune prestation.</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-baseline justify-between gap-2 text-[11px]"
            >
              <span className="text-foreground/80">{it.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatCHF(it.annual)} ({formatCHF(it.monthly)} / mois)
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
