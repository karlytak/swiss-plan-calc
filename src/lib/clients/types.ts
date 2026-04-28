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
  return value.filter(
    (c): c is Child =>
      typeof c === "object" &&
      c !== null &&
      typeof (c as Child).first_name === "string",
  );
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
