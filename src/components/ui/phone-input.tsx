// PhoneInput suisse : préfixe pays sélectionnable (+41 par défaut),
// formatage automatique des numéros suisses (NN NNN NN NN), validation simple.

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTRY_CODES = [
  { code: "+41", flag: "🇨🇭", label: "Suisse" },
  { code: "+33", flag: "🇫🇷", label: "France" },
  { code: "+49", flag: "🇩🇪", label: "Allemagne" },
  { code: "+39", flag: "🇮🇹", label: "Italie" },
  { code: "+352", flag: "🇱🇺", label: "Luxembourg" },
  { code: "+32", flag: "🇧🇪", label: "Belgique" },
] as const;

type CountryCode = (typeof COUNTRY_CODES)[number]["code"];

function parseValue(value: string): { country: CountryCode; local: string } {
  const trimmed = value.trim();
  for (const c of COUNTRY_CODES) {
    if (trimmed.startsWith(c.code)) {
      return { country: c.code, local: trimmed.slice(c.code.length).replace(/^\s+/, "") };
    }
  }
  // Pas de préfixe → on suppose CH si commence par 0, sinon brut.
  if (trimmed.startsWith("0")) {
    return { country: "+41", local: trimmed.slice(1) };
  }
  return { country: "+41", local: trimmed };
}

/** Formate un numéro suisse en NN NNN NN NN. Garde la frappe en cours fluide. */
function formatSwiss(local: string): string {
  const digits = local.replace(/\D/g, "").slice(0, 9);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 5));
  if (digits.length > 5) parts.push(digits.slice(5, 7));
  if (digits.length > 7) parts.push(digits.slice(7, 9));
  return parts.join(" ");
}

function formatGeneric(local: string): string {
  return local.replace(/\D/g, "");
}

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}

export function PhoneInput({ value, onChange, id, placeholder, className }: PhoneInputProps) {
  const { country, local } = parseValue(value);
  const isSwiss = country === "+41";
  const display = isSwiss ? formatSwiss(local) : formatGeneric(local);

  const setCountry = (next: CountryCode) => {
    const digits = local.replace(/\D/g, "");
    onChange(digits ? `${next} ${digits}` : next);
  };

  const setLocal = (next: string) => {
    const digits = next.replace(/\D/g, "");
    if (!digits) {
      onChange("");
      return;
    }
    onChange(`${country} ${digits}`);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
        <SelectTrigger className="w-[110px] shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="mr-1">{c.flag}</span> {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={display}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder ?? (isSwiss ? "79 123 45 67" : "Numéro local")}
        className="flex-1 tabular-nums"
      />
    </div>
  );
}
