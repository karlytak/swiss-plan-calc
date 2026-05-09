import { createFileRoute } from "@tanstack/react-router";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_app/companies/new")({
  head: () => ({ meta: [{ title: t("company_form.head.new") }] }),
  component: () => <CompanyForm mode="create" />,
});
