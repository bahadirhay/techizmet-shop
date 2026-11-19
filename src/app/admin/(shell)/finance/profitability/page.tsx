import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FinanceProfitabilityView } from "@/components/admin/FinanceProfitabilityView";
import { ensureFinanceDefaults } from "@/lib/finance/defaults";
import {
  loadProfitabilityReport,
  type ProfitabilityPeriodInput,
} from "@/lib/finance/profitability";
import { requireStaffPage } from "@/lib/staff-auth";

const PRESET_DAYS = new Set([7, 30, 90, 365]);

function parsePeriod(sp: {
  days?: string;
  from?: string;
  to?: string;
}): ProfitabilityPeriodInput {
  const from = sp.from?.trim();
  const to = sp.to?.trim();
  if (from || to) {
    return { from: from || undefined, to: to || undefined };
  }
  const n = Number(sp.days);
  if (PRESET_DAYS.has(n)) return { days: n };
  return { days: 30 };
}

export default async function FinanceProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const auth = await requireStaffPage();
  const sp = await searchParams;
  const period = parsePeriod(sp);

  await ensureFinanceDefaults(auth.siteId);
  const report = await loadProfitabilityReport(auth.siteId, period);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ön muhasebe", href: "/admin/finance" }, { label: "Kârlılık" }]}
        title="Pazaryeri kârlılık raporu"
        description="Üstte üç ayrım: Tümü, satış kanalları ve her pazaryeri. Altta kesinti ve maliyet detayı."
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
