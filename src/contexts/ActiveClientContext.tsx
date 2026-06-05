import { createContext, useContext, useState, type ReactNode } from "react";
import type { Client } from "@/lib/clients/types";

interface ActiveClientState {
  activeClient: Client | null;
  setActiveClient: (client: Client | null) => void;
}

const ActiveClientContext = createContext<ActiveClientState | null>(null);

export function ActiveClientProvider({ children }: { children: ReactNode }) {
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  return (
    <ActiveClientContext.Provider value={{ activeClient, setActiveClient }}>
      {children}
    </ActiveClientContext.Provider>
  );
}

export function useActiveClient() {
  const ctx = useContext(ActiveClientContext);
  if (!ctx) throw new Error("useActiveClient must be used within ActiveClientProvider");
  return ctx;
}
