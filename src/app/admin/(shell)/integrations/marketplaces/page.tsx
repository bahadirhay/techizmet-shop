import { redirect } from "next/navigation";

export default function MarketplaceIntegrationsIndexRedirect() {
  redirect("/admin/integrations");
}
