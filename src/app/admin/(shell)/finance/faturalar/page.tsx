import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { KdvTracker } from "@/components/admin/KdvTracker";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-auth";
import type { InvoiceEntryRow } from "@/lib/finance/kdv";

export const dynamic = "force-dynamic";

export default async function FaturalarPage() {
  const auth = await requireStaffPage();
  const year = new Date().getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const entries = await prisma.invoiceEntry.findMany({
    where: { siteId: auth.siteId, invoiceDate: { gte: start, lt: end } },
    orderBy: { invoiceDate: "desc" },
  });

  const initialEntries: InvoiceEntryRow[] = entries.map((e) => ({
    id: e.id,
    direction: e.direction as "outgoing" | "incoming",
    invoiceDate: e.invoiceDate.toISOString(),
    invoiceNo: e.invoiceNo,
    counterparty: e.counterparty,
    netMinor: e.netMinor,
    kdvRate: e.kdvRate,
    kdvMinor: e.kdvMinor,
    description: e.description,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ön muhasebe", href: "/admin/finance" }, { label: "Fatura & KDV Takibi" }]}
        title="Fatura & KDV Takibi"
        description="Kestiğiniz (satış) ve gelen (alış/gider) faturaları kaydedin. Sistem her ay için Hesaplanan KDV, İndirilecek KDV ve Ödenecek KDV'yi otomatik hesaplar. Devreden KDV zinciri aylık olarak izlenir."
      />
      <KdvTracker initialYear={year} initialEntries={initialEntries} />
    </div>
  );
}
