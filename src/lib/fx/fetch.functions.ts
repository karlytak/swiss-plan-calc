import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const InputSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(60),
  currency: z.enum(["EUR", "USD", "GBP", "CAD", "JPY"]),
});

export interface FxRateEntry {
  date: string;
  effectiveDate?: string;
  rate: number | null;
  source: "ECB" | "fallback";
  error?: string;
}

export async function fetchMarketRates(input: { data: { dates: string[]; currency: string } }): Promise<FxRateEntry[]> {
  const { dates, currency } = InputSchema.parse(input.data);

  const { data, error } = await supabase.functions.invoke("fx-rates", {
    body: { dates, currency },
  });

  if (error) {
    throw new Error("Erreur récupération taux de change : " + error.message);
  }

  return data as FxRateEntry[];
}
