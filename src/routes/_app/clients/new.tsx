import { createFileRoute } from "@tanstack/react-router";
import { ClientWizard } from "@/components/clients/ClientWizard";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_app/clients/new")({
  head: () => ({ meta: [{ title: t("wizard.head.new") }] }),
  component: NewClientPage,
});

function NewClientPage() {
  return <ClientWizard mode="create" />;
}
