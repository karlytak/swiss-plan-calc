import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  icon?: LucideIcon;
  /** Lien vers le calculateur détaillé (optionnel). */
  detailLink?: {
    to: string;
    label?: string;
    search?: Record<string, string | undefined>;
  };
  /** Bandeau d'alerte facultatif (info / warning). */
  hint?: { tone: "info" | "warn" | "success"; text: string };
  className?: string;
  children: React.ReactNode;
}

export function DashboardCard({
  title,
  icon: Icon,
  detailLink,
  hint,
  className,
  children,
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        </div>
        {detailLink && (
          <Link
            to={detailLink.to}
            search={detailLink.search}
            className="inline-flex"
          >
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              {detailLink.label ?? "Voir détail"}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </div>
      <div className="mt-3 space-y-2">{children}</div>
      {hint && (
        <p
          className={cn(
            "mt-3 rounded-md border px-2 py-1.5 text-xs",
            hint.tone === "warn" &&
              "border-amber-300/40 bg-amber-50/50 text-amber-900 dark:bg-amber-900/10 dark:text-amber-200",
            hint.tone === "info" &&
              "border-border bg-muted/30 text-muted-foreground",
            hint.tone === "success" &&
              "border-success/40 bg-success/10 text-success",
          )}
        >
          {hint.text}
        </p>
      )}
    </div>
  );
}

export function DashboardMetric({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right">
        <span
          className={cn(
            "tabular-nums",
            emphasis ? "text-base font-semibold" : "text-sm",
          )}
        >
          {value}
        </span>
        {sub && (
          <span className="ml-1 text-[10px] text-muted-foreground">{sub}</span>
        )}
      </span>
    </div>
  );
}

export function DashboardEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
      {children}
    </p>
  );
}
