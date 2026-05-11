// Récupère la dernière simulation fiscale enregistrée pour un client
// (income_tax ou source_tax) et expose un taux moyen / taux marginal estimés.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClientFiscalSnapshot {
  averageRate: number;
  marginalRateEstimate: number;
  source: "income_tax" | "source_tax";
  lastUpdated: string;
}

export function useClientFiscalSnapshot(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-fiscal-snapshot", clientId],
    enabled: Boolean(clientId),
    queryFn: async (): Promise<ClientFiscalSnapshot | null> => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("simulation_history")
        .select("kind, summary, created_at")
        .eq("client_id", clientId)
        .in("kind", ["income_tax", "source_tax"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      const s = (data.summary ?? {}) as Record<string, unknown>;
      // income_tax stocke effectiveRate ; source_tax stocke rate
      const avg = Number(s.effectiveRate ?? s.rate ?? 0);
      if (!Number.isFinite(avg) || avg <= 0) return null;
      return {
        averageRate: avg,
        marginalRateEstimate: Math.min(avg + 5, 40),
        source: data.kind as "income_tax" | "source_tax",
        lastUpdated: data.created_at,
      };
    },
  });
}
