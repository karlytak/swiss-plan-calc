import { createFileRoute } from "@tanstack/react-router";
import { CompanyForm } from "@/components/companies/CompanyForm";

export const Route = createFileRoute("/_app/companies/new")({
  head: () => ({ meta: [{ title: "Nouvelle société · SwissBroker Pro" }] }),
  component: () => <CompanyForm mode="create" />,
});
