import type { Database } from "@/integrations/supabase/types";
import { t } from "@/lib/i18n";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

export type LegalForm = Database["public"]["Enums"]["company_legal_form"];

const LEGAL_FORM_FR: Record<LegalForm, string> = {
  sarl: "Sàrl",
  sa: "SA",
  cooperative: "Coopérative",
  association: "Association",
  other: "Autre",
};

// Proxy : se résout dynamiquement via i18n à chaque accès.
export const LEGAL_FORM_LABELS: Record<LegalForm, string> = new Proxy(LEGAL_FORM_FR, {
  get(target, prop: string) {
    if (!(prop in target)) return (target as Record<string, string>)[prop];
    return t(`enum.legal_form.${prop}`, undefined, (target as Record<string, string>)[prop]);
  },
}) as Record<LegalForm, string>;

// Helper réactif : retourne les options localisées au moment de l'appel.
export function getLegalFormOptions(): { value: LegalForm; label: string }[] {
  return (Object.keys(LEGAL_FORM_FR) as LegalForm[]).map((value) => ({
    value,
    label: LEGAL_FORM_LABELS[value],
  }));
}

// Compat : conservé pour anciens call-sites mais résolu à la lecture via le proxy.
export const LEGAL_FORM_OPTIONS: { value: LegalForm; label: string }[] = (Object.keys(
  LEGAL_FORM_FR,
) as LegalForm[]).map((value) => ({
  value,
  get label() {
    return LEGAL_FORM_LABELS[value];
  },
}));

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
