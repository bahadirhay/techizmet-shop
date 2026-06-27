import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ManuelFaturaKes } from "@/components/admin/ManuelFaturaKes";
import { requireStaffPage } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

export default async function FaturaKesPage() {
  await requireStaffPage();

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_STORE_URL ??
    "https://sizin-domain.com"
  ).replace(/\/$/, "");

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ön muhasebe", href: "/admin/finance" }, { label: "Fatura Kes" }]}
        title="Manuel Fatura Kes"
        description="GİB e-Arşiv portalı üzerinden elektronik fatura kesin. Fatura otomatik olarak KDV takibine eklenir."
      />
      <ManuelFaturaKes siteUrl={siteUrl} />
    </div>
  );
}
