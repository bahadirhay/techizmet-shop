import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FinanceDashboardView } from "@/components/admin/FinanceDashboardView";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import { loadFinanceSummary } from "@/lib/finance/summary";
import { requireStaffPage } from "@/lib/staff-auth";

function parsePeriod(raw: string | undefined): number {
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const auth = await requireStaffPage();
  const { days } = await searchParams;
  const period = parsePeriod(days);

  await ensureFinanceDefaults(auth.siteId);
  const summary = await loadFinanceSummary(auth.siteId, period);

  return (
    <div>
      <AdminPageHeader
        title="Ön muhasebe"
        description="Gelir ve gider takibi, nakit/kredi kartı hareketleri, pazaryeri alacakları ve kesinti fatura mutabakatı."
        actions={
          <Link
            href="/admin/finance/transactions/new"
            className="rounded-lg bg-[var(--kn-brand)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Yeni hareket
          </Link>
        }
      />
      <FinanceDashboardView summary={summary} />
    </div>
  );
}
