import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MarketplacePayoutsView } from "@/components/admin/MarketplacePayoutsView";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { loadPayoutReconciliation } from "@/lib/finance/payout-reconciliation";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export default async function FinancePayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const auth = await requireStaffPage();
  const { platform } = await searchParams;

  await ensureFinanceDefaults(auth.siteId);
  const report = await loadPayoutReconciliation(auth.siteId, platform || undefined);

  const activeIntegrations = await prisma.marketplaceIntegration.findMany({
    where: {
      siteId: auth.siteId,
      active: true,
      platform: { in: ["trendyol", "hepsiburada", "amazon_tr"] },
    },
    select: { platform: true },
  });

  const activePlatforms: Record<string, boolean> = {
    trendyol: false,
    hepsiburada: false,
    amazon_tr: false,
  };
  for (const row of activeIntegrations) {
    activePlatforms[row.platform] = true;
  }

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ön muhasebe", href: "/admin/finance" }, { label: "Hakediş" }]}
        title="Pazaryeri hakediş mutabakatı"
        description="Trendyol, Hepsiburada ve Amazon finans API'lerinden hakediş çekin; CSV ile manuel kayıt da ekleyebilirsiniz."
      />
      <MarketplacePayoutsView
        report={report}
        platform={platform}
        activePlatforms={activePlatforms}
      />
    </div>
  );
}
