import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Coins,
  Landmark,
  PiggyBank,
  TrendingUp,
  ShieldCheck,
  HeartHandshake,
  Building2,
  BarChart3,
  ArrowRight,
  ShieldPlus,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { CalcCard } from "@/components/calculators/CalcUI";
import { useT } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/calculators/")({
  head: () => ({ meta: [{ title: "Calculateurs · SwissBroker Pro" }] }),
  component: CalculatorsIndex,
});

type SubLink = { to: string; labelKey: string };
type Module =
  | {
      kind: "single";
      icon: LucideIcon;
      titleKey: string;
      descKey: string;
      to: string;
    }
  | {
      kind: "group";
      icon: LucideIcon;
      titleKey: string;
      descKey: string;
      links: SubLink[];
    };

type Section = {
  titleKey: string;
  subtitleKey: string;
  modules: Module[];
};

const SECTIONS: Section[] = [
  {
    titleKey: "calc.section.prevoyance",
    subtitleKey: "calc.section.prevoyance.desc",
    modules: [
      {
        kind: "single",
        icon: HeartHandshake,
        titleKey: "calc.avs_ai.title",
        descKey: "calc.avs_ai.desc",
        to: "/calculators/avs-ai",
      },
      {
        kind: "group",
        icon: Landmark,
        titleKey: "calc.group.lpp.title",
        descKey: "calc.group.lpp.desc",
        links: [
          { to: "/calculators/lpp", labelKey: "calc.lpp.title" },
          { to: "/calculators/vested-benefits", labelKey: "calc.vested.title" },
        ],
      },
      {
        kind: "single",
        icon: PiggyBank,
        titleKey: "calc.pillar3a.title",
        descKey: "calc.pillar3a.desc",
        to: "/calculators/pillar3a",
      },
    ],
  },
  {
    titleKey: "calc.section.fiscalite",
    subtitleKey: "calc.section.fiscalite.desc",
    modules: [
      {
        kind: "group",
        icon: Coins,
        titleKey: "calc.group.fiscalite.title",
        descKey: "calc.group.fiscalite.desc",
        links: [
          { to: "/calculators/income-tax", labelKey: "calc.income_tax.title" },
          { to: "/calculators/source-tax", labelKey: "calc.source_tax.title" },
          { to: "/calculators/tou", labelKey: "calc.tou.title" },
          { to: "/calculators/cross-border", labelKey: "calc.cross_border.title" },
        ],
      },
      {
        kind: "single",
        icon: ShieldPlus,
        titleKey: "calc.health_france.title",
        descKey: "calc.health_france.desc",
        to: "/calculators/health-insurance-france",
      },
      {
        kind: "single",
        icon: Clock,
        titleKey: "calc.overtime.title",
        descKey: "calc.overtime.desc",
        to: "/calculators/overtime",
      },
    ],
  },
  {
    titleKey: "calc.section.strategie",
    subtitleKey: "calc.section.strategie.desc",
    modules: [
      {
        kind: "single",
        icon: Building2,
        titleKey: "calc.director.title",
        descKey: "calc.director.desc",
        to: "/calculators/director-compensation",
      },
      {
        kind: "group",
        icon: BarChart3,
        titleKey: "calc.group.decision.title",
        descKey: "calc.group.decision.desc",
        links: [
          { to: "/calculators/canton-compare", labelKey: "calc.canton_compare.title" },
          { to: "/calculators/retirement", labelKey: "calc.retirement.title" },
          { to: "/calculators/investment-compare", labelKey: "calc.invcompare.title" },
        ],
      },
    ],
  },
];

function CalculatorsIndex() {
  const t = useT();
  return (
    <div className="space-y-10">
      {SECTIONS.map((section) => (
        <section key={section.titleKey}>
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-tight">
              {t(section.titleKey)}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t(section.subtitleKey)}
            </p>
          </div>
          <div
            className={cn(
              "grid grid-cols-1 gap-4 sm:grid-cols-2",
              section.modules.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
            )}
          >
            {section.modules.map((mod) => (
              <ModuleCard key={mod.titleKey} mod={mod} t={t} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ModuleCard({
  mod,
  t,
}: {
  mod: Module;
  t: (key: string) => string;
}) {
  const Icon = mod.icon;
  const inner = (
    <CalcCard className="flex h-full flex-col transition-all hover:border-primary/40 hover:shadow-elegant">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight">
        {t(mod.titleKey)}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{t(mod.descKey)}</p>
      <div className="mt-auto pt-4">
        {mod.kind === "single" ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            {t("calc.open")}{" "}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        ) : (
          <ul className="space-y-1.5">
            {mod.links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <ArrowRight className="h-3 w-3" />
                  {t(link.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CalcCard>
  );

  if (mod.kind === "single") {
    return (
      <Link to={mod.to} className="group block h-full">
        {inner}
      </Link>
    );
  }
  return <div className="h-full">{inner}</div>;
}
