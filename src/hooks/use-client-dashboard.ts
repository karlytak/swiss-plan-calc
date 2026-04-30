import { useMemo } from "react";
import {
  computeClientDashboard,
  type ClientBundle,
  type ClientDashboard,
} from "@/lib/client-dashboard";

/**
 * Hook réactif : recompute l'ensemble du dashboard client dès que
 * client / pension / assets change. Pur, synchrone, sans I/O.
 */
export function useClientDashboard(bundle: ClientBundle | null | undefined): ClientDashboard | null {
  return useMemo(() => {
    if (!bundle) return null;
    return computeClientDashboard(bundle);
  }, [bundle?.client, bundle?.pension, bundle?.assets]);
}
