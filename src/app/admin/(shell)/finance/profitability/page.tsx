import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FinanceProfitabilityView } from "@/components/admin/FinanceProfitabilityView";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { loadProfitabilityReport } from "@/lib/finance/profitability";
import { requireStaffPage } from "@/lib/staff-auth";

function parsePeriod(raw: string | undefined): number {
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

export default async function FinanceProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const auth = await requireStaffPage();
  const { days } = await searchParams;
  const period = parsePeriod(days);

  await ensureFinanceDefaults(auth.siteId);
  const report = await loadProfitabilityReport(auth.siteId, period);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ön muhasebe", href: "/admin/finance" }, { label: "Kârlılık" }]}
        title="Pazaryeri kârlılık raporu"
        description="Kanal bazlı brüt ciro, tahmini/onaylı kesintiler, net kâr marjı, hakediş bekleyen tutar ve tahmin–gerçek fark analizi."
        actions={
          <Link
            href="/admin/finance/payouts"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
          >
            Hakediş içe aktar
          </Link>
        }
      />
      <FinanceProfitabilityView report={report} />
    </div>
  );
}
