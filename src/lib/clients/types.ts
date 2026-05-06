import type { Database } from "@/integrations/supabase/types";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export type ClientPension = Database["public"]["Tables"]["client_pension"]["Row"];
export type ClientAssets = Database["public"]["Tables"]["client_assets"]["Row"];
export type ClientNote = Database["public"]["Tables"]["client_notes"]["Row"];

export interface Child {
  first_name: string;
  date_of_birth: string; // ISO
  in_household: boolean;
}

export function parseChildren(value: unknown): Child[] {
  if (!Array.isArray(value)) return [];
  return value.filter((c): c is Child => {
    if (typeof c !== "object" || c === null) return false;
    const child = c as Partial<Child>;
    const hasName = typeof child.first_name === "string" && child.first_name.trim() !== "";
    const hasDob = typeof child.date_of_birth === "string" && child.date_of_birth.trim() !== "";
    // Ignore les lignes vides laissées par le wizard (ni nom ni date).
    return hasName || hasDob;
  });
}

export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
