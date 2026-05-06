import type { Database } from "@/integrations/supabase/types";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

export type LegalForm = Database["public"]["Enums"]["company_legal_form"];

export const LEGAL_FORM_LABELS: Record<LegalForm, string> = {
  sarl: "Sàrl",
  sa: "SA",
  cooperative: "Coopérative",
  association: "Association",
  other: "Autre",
};

export const LEGAL_FORM_OPTIONS: { value: LegalForm; label: string }[] = [
  { value: "sarl", label: "Sàrl" },
  { value: "sa", label: "SA" },
  { value: "cooperative", label: "Coopérative" },
  { value: "association", label: "Association" },
  { value: "other", label: "Autre" },
];

/** Normalise un IDE saisi (espaces/tirets/points variés) vers CHE-XXX.XXX.XXX. */
export function normalizeIde(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 9) return input.trim() || null; // laisse l'invalide pour que la validation UI s'en charge
  return `CHE-${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}`;
}

export const IDE_REGEX = /^CHE-\d{3}\.\d{3}\.\d{3}$/;

export function isValidIde(value: string | null | undefined): boolean {
  if (!value) return true; // optionnel
  return IDE_REGEX.test(value);
}
