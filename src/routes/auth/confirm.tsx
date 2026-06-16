import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const confirmSearchSchema = z.object({
  plan: z.enum(["starter", "pro", "cabinet"]).optional(),
});

export const Route = createFileRoute("/auth/confirm")({
  validateSearch: (s) => confirmSearchSchema.parse(s),
  component: ConfirmPage,
});

const PRICE_IDS: Record<string, string> = {
  starter: import.meta.env.VITE_STRIPE_STARTER_MONTHLY ?? "",
  pro: import.meta.env.VITE_STRIPE_PRO_MONTHLY ?? "",
  cabinet: import.meta.env.VITE_STRIPE_CABINET_MONTHLY ?? "",
};

function ConfirmPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const plan = search.plan ?? "pro";

  useEffect(() => {
    const redirect = async () => {
      // Attendre que Supabase traite le token de confirmation dans l'URL
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError("Lien invalide ou expiré. Veuillez recommencer l'inscription.");
        return;
      }

      const priceId = PRICE_IDS[plan];
      if (!priceId) {
        navigate({ to: "/dashboard" });
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke("stripe-checkout", {
          body: {
            priceId,
            brokerId: session.user.id,
            brokerEmail: session.user.email,
            plan,
          },
        });

        if (fnError || !data?.url) throw new Error("Erreur Stripe");
        window.location.href = data.url;
      } catch {
        setError("Erreur lors de la redirection vers le paiement. Contactez le support.");
      }
    };

    redirect();
  }, [plan, navigate]);

  if (error) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-hero flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elegant text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold">Une erreur est survenue</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <a href="/auth?mode=signup" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
            Recommencer l'inscription
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-elegant text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">
          Confirmation en cours, redirection vers le paiement...
        </p>
      </div>
    </div>
  );
}
