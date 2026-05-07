import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CompanyForm } from "@/components/companies/CompanyForm";
import type { Company } from "@/lib/companies/types";

export const Route = createFileRoute("/_app/companies/$companyId_/edit")({
  head: () => ({ meta: [{ title: "Modifier société · SwissBroker Pro" }] }),
  component: EditCompanyPage,
});

function EditCompanyPage() {
  const { companyId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();
      if (error) throw error;
      return data as Company;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight">Société introuvable</h1>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/companies">
            <ArrowLeft className="h-4 w-4" /> Retour à la liste
          </Link>
        </Button>
      </div>
    );
  }

  return <CompanyForm mode="edit" initial={data} />;
}
