// Server function — récupère les taux journaliers de référence.
//
// Source primaire : api.frankfurter.app (proxy gratuit ECB, sans clé).
// Convertit toutes les devises en CHF (1 unit FOREIGN = X CHF).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(60),
  currency: z.enum(["EUR", "USD", "GBP"]),
});

export interface FxRateEntry {
  date: string;
  rate: number | null;
  source: "ECB" | "fallback";
  error?: string;
}

export const fetchMarketRates = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<FxRateEntry[]> => {
    const { dates, currency } = data;
    // Frankfurter renvoie : { date, base, rates: { CHF: X } } pour base=currency&symbols=CHF
    const results = await Promise.all(
      dates.map(async (date): Promise<FxRateEntry> => {
        try {
          const url = `https://api.frankfurter.app/${date}?from=${currency}&to=CHF`;
          const res = await fetch(url);
          if (!res.ok) {
            return { date, rate: null, source: "fallback", error: `HTTP ${res.status}` };
          }
          const json = (await res.json()) as { rates?: { CHF?: number } };
          const rate = json.rates?.CHF;
          if (typeof rate !== "number") {
            return { date, rate: null, source: "fallback", error: "no_rate" };
          }
          return { date, rate: Math.round(rate * 10000) / 10000, source: "ECB" };
        } catch (e) {
          return {
            date,
            rate: null,
            source: "fallback",
            error: e instanceof Error ? e.message : "unknown",
          };
        }
      }),
    );
    return results;
  });
