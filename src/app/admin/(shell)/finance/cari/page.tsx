import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FinanceCariClient } from "@/components/admin/FinanceCariClient";
import { loadAllCariRows, loadReceivablesPayables } from "@/lib/finance/cari-ledger";
import { requireStaffPage } from "@/lib/staff-auth";

type Tab = "cariler" | "alacak" | "borc";

function parseTab(raw: string | undefined): Tab {
  if (raw === "alacak" || raw === "borc") return raw;
  return "cariler";
}

export default async function FinanceCariPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const auth = await requireStaffPage();
  const { tab: tabRaw } = await searchParams;
  const tab = parseTab(tabRaw);

  const [allRows, { receivables, payables, totalReceivableMinor, totalPayableMinor }] =
    await Promise.all([loadAllCariRows(auth.siteId), loadReceivablesPayables(auth.siteId)]);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ön Muhasebe", href: "/admin/finance" }, { label: "Cari & Alacak/Borç" }]}
        title="Cari takip"
        description="Karşı taraf bakiyeleri, açık alacak ve borç listeleri, vade takibi."
      />
      <FinanceCariClient
        tab={tab}
        allRows={allRows}
        receivables={receivables}
        payables={payables}
        totalReceivableMinor={totalReceivableMinor}
        totalPayableMinor={totalPayableMinor}
      />
    </div>
  );
}
