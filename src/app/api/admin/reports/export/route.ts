import { NextResponse } from "next/server";
import { loadSalesReport, type SalesReportPeriod } from "@/lib/admin/sales-report";
import { requireStaffApi } from "@/lib/staff-auth";

function csvEscape(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells: (string | number | null | undefined)[]) {
  return `${cells.map(csvEscape).join(",")}\n`;
}

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.dashboard");
  if (auth instanceof NextResponse) return auth;

  const days = Number(new URL(req.url).searchParams.get("days") ?? "30");
  const period: SalesReportPeriod = days === 7 || days === 90 ? days : 30;
  const report = await loadSalesReport(auth.siteId, period);

  let body = csvRow(["Rapor", `Son ${report.periodDays} gün`]);
  body += csvRow(["Ciro (kuruş)", report.totals.revenueMinor]);
  body += csvRow(["Sipariş", report.totals.orders]);
  body += csvRow(["Ortalama sepet (kuruş)", report.totals.avgOrderMinor]);
  body += csvRow(["Yeni müşteri", report.totals.newCustomers]);
  body += "\n";
  body += csvRow(["Ürün", "Adet", "Ciro (kuruş)"]);
  for (const p of report.topProducts) {
    body += csvRow([p.title, p.qty, p.revenueMinor]);
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="satis-raporu-${period}gun.csv"`,
    },
  });
}
