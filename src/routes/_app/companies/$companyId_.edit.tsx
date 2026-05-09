import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CompanyForm } from "@/components/companies/CompanyForm";
import type { Company } from "@/lib/companies/types";
import { t } from "@/lib/i18n";
import { useT } from "@/contexts/LanguageContext";

export const Route = createFileRoute("/_app/companies/$companyId_/edit")({
  head: () => ({ meta: [{ title: t("company_form.head.edit") }] }),
  component: EditCompanyPage,
});

function EditCompanyPage() {
  const tt = useT();
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
        <h1 className="text-2xl font-bold tracking-tight">{tt("company_form.notfound")}</h1>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/companies">
            <ArrowLeft className="h-4 w-4" /> {tt("company_form.notfound.back")}
          </Link>
        </Button>
      </div>
    );
  }

  return <CompanyForm mode="edit" initial={data} />;
}
