import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReportsView } from "@/components/admin/ReportsView";
import { loadSalesReport, type SalesReportPeriod } from "@/lib/admin/sales-report";
import { requireStaffPage } from "@/lib/staff-auth";

function parsePeriod(raw: string | undefined): SalesReportPeriod {
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const auth = await requireStaffPage();
  const { days } = await searchParams;
  const period = parsePeriod(days);
  const report = await loadSalesReport(auth.siteId, period);

  return (
    <div>
      <AdminPageHeader
        title="Raporlar & Analitik"
        description="Satış, ürün performansı ve ödeme dağılımı — seçili dönem için bu mağazanın veritabanı kayıtları."
      />
      <ReportsView report={report} />
    </div>
  );
}
