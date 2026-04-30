// Champ numérique robuste pour montants CHF / pourcentages.
// - Stocke en interne une string "brute" (sans séparateurs, point décimal).
// - Affiche formaté avec apostrophes hors focus (style suisse).
// - Au focus, sélectionne tout le contenu pour faciliter la saisie (plus de "0" qui colle).
// - Accepte chiffres, virgule, point, espace, apostrophe en frappe ; normalise au blur.

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const numFmt = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 4 });

function normalize(raw: string): string {
  // Garde uniquement chiffres + virgule/point + signe -
  const cleaned = raw.replace(/[\s']/g, "").replace(",", ".");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return cleaned;
  // Validation souple (ne casse pas la frappe en cours)
  if (!/^-?\d*(\.\d*)?$/.test(cleaned)) {
    return cleaned.replace(/[^\d.\-]/g, "");
  }
  return cleaned;
}

function format(raw: string): string {
  if (!raw || raw === "-" || raw === ".") return raw;
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  // Préserve les décimales saisies (ex. "0.5" -> "0,5")
  const [intPart, decPart] = raw.split(".");
  const intNum = Number(intPart || "0");
  const intFmt = numFmt.format(intNum);
  return decPart !== undefined ? `${intFmt},${decPart}` : intFmt;
}

export interface NumFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (value: string) => void;
  /** Suffixe affiché à droite (ex: "CHF", "%", "ans"). */
  suffix?: string;
  /** Nombre min (UX seulement). */
  min?: number;
  /** Nombre max (UX seulement). */
  max?: number;
}

export const NumField = React.forwardRef<HTMLInputElement, NumFieldProps>(
  ({ value, onChange, suffix, className, onFocus, onBlur, ...rest }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const display = focused ? value.replace(".", ",") : format(value);

    return (
      <div className="relative">
        <Input
          ref={ref}
          inputMode="decimal"
          value={display}
          onFocus={(e) => {
            setFocused(true);
            // Sélectionne tout pour permettre l'écrasement immédiat (plus de 0 qui colle)
            requestAnimationFrame(() => e.target.select());
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          onChange={(e) => onChange(normalize(e.target.value))}
          className={cn(suffix && "pr-12", "tabular-nums", className)}
          {...rest}
        />
        {suffix ? (
          <span
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground"
            aria-hidden
          >
            {suffix}
          </span>
        ) : null}
      </div>
    );
  },
);
NumField.displayName = "NumField";
