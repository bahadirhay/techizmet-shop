import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MarketplaceReconciliationView } from "@/components/admin/MarketplaceReconciliationView";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { loadMarketplaceReconciliation } from "@/lib/finance/reconciliation";
import { requireStaffPage } from "@/lib/staff-auth";

export default async function FinanceReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const auth = await requireStaffPage();
  const { platform } = await searchParams;

  await ensureFinanceDefaults(auth.siteId);
  const { rows, unmatched } = await loadMarketplaceReconciliation(
    auth.siteId,
    platform || undefined,
  );

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ön muhasebe", href: "/admin/finance" }, { label: "Mutabakat" }]}
        title="Pazaryeri mutabakat"
        description="Sipariş gelirleri ile Trendyol / Hepsiburada kesinti faturalarını karşılaştırın. Eşleşmemiş kesintileri siparişe bağlayın."
      />
      <MarketplaceReconciliationView rows={rows} unmatched={unmatched} platform={platform} />
    </div>
  );
}
