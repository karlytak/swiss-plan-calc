// Mode "guide" : visite interactive d'un calculateur.
// Affiche les explications essentielles dans l'ordre de saisie, en surlignant
// chaque champ ciblé par un id (`data-guide="<id>"`).
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Sparkles, ArrowRight, ArrowLeft, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/contexts/LanguageContext";

export type GuideStep = {
  /** Id ciblé via data-guide="..." sur l'élément à surligner. Optionnel pour intro/outro. */
  target?: string;
  title: string;
  body: ReactNode;
};

/** Bouton à placer dans la barre d'action d'un calculateur. */
export function GuideToggleButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="gap-1.5 border-primary/40 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground"
    >
      <Sparkles className="h-3.5 w-3.5" />
      {t("common.guide_mode")}
    </Button>
  );
}

export function GuideMode({
  open,
  onClose,
  steps,
  title = "Mode guide",
}: {
  open: boolean;
  onClose: () => void;
  steps: GuideStep[];
  title?: string;
}) {
  const [i, setI] = useState(0);
  const step = steps[i];

  useEffect(() => {
    if (!open) setI(0);
  }, [open]);

  // Scroll + surlignage du champ ciblé
  const rect = useTargetRect(open ? step?.target : undefined, [i, open]);

  // ESC pour fermer, flèches pour naviguer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(steps.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, steps.length]);

  if (!open || typeof document === "undefined") return null;

  const isLast = i === steps.length - 1;
  const isFirst = i === 0;

  return createPortal(
    <>
      {/* Overlay sombre + trou autour du champ ciblé */}
      <div
        className="fixed inset-0 z-[80] bg-foreground/40 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
      />
      {rect && (
        <div
          className="pointer-events-none fixed z-[81] rounded-xl ring-4 ring-primary ring-offset-2 ring-offset-background transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
          }}
        />
      )}

      {/* Bulle d'aide */}
      <div
        className={cn(
          "fixed z-[82] w-[min(92vw,420px)] rounded-2xl border border-primary/40 bg-card p-4 shadow-2xl",
          "animate-in fade-in-0 zoom-in-95",
        )}
        style={positionFor(rect)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-primary">
            <Info className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {title} · {i + 1}/{steps.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h4 className="mt-2 text-sm font-semibold leading-tight">{step.title}</h4>
        <div className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
          {step.body}
        </div>

        {/* Progression */}
        <div className="mt-3 flex gap-1">
          {steps.map((_, k) => (
            <div
              key={k}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                k <= i ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setI((x) => Math.max(0, x - 1))}
            disabled={isFirst}
            className="gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Précédent
          </Button>
          {isLast ? (
            <Button type="button" size="sm" onClick={onClose} className="gap-1">
              Terminer
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setI((x) => Math.min(steps.length - 1, x + 1))}
              className="gap-1"
            >
              Suivant
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

// --- helpers ---

function useTargetRect(targetId: string | undefined, deps: unknown[]) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetId) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-guide="${targetId}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const update = () => setRect(el.getBoundingClientRect());
    // léger délai pour laisser le scroll se stabiliser
    const t = window.setTimeout(update, 280);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return rect;
}

function positionFor(rect: DOMRect | null): React.CSSProperties {
  if (!rect || typeof window === "undefined") {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const margin = 16;
  const bubbleW = Math.min(window.innerWidth * 0.92, 420);
  const spaceBelow = window.innerHeight - rect.bottom;
  const placeBelow = spaceBelow > 220;
  const top = placeBelow ? rect.bottom + margin : Math.max(margin, rect.top - 220);
  let left = rect.left + rect.width / 2 - bubbleW / 2;
  left = Math.max(margin, Math.min(window.innerWidth - bubbleW - margin, left));
  return { top, left };
}
