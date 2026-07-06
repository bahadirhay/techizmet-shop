import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StockReportView } from "@/components/admin/StockAdminViews";
import { StockInvoiceMappingsManager } from "@/components/admin/StockPackagingManager";
import { loadStockLedger, loadStockSummary } from "@/lib/stock/report";
import { requireStaffPage } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86400000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default async function StockReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const auth = await requireStaffPage();
  const sp = await searchParams;
  const defaults = defaultRange();
  const from = sp.from ?? defaults.from;
  const to = sp.to ?? defaults.to;

  const [summary, ledger, mappings, stockItems] = await Promise.all([
    loadStockSummary(auth.siteId, { from, to }),
    loadStockLedger(auth.siteId, { from, to }),
    prisma.financeInvoiceLineStockMapping.findMany({
      where: { siteId: auth.siteId },
      include: { stockItem: { select: { name: true } } },
      orderBy: { descriptionNorm: "asc" },
    }),
    prisma.stockItem.findMany({
      where: { siteId: auth.siteId, active: true },
      select: { id: true, name: true, unit: true, kind: true, balanceBase: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <AdminPageHeader
        breadcrumb={[{ label: "Ön muhasebe", href: "/admin/finance" }, { label: "Stok raporu" }]}
        title="Stok hareketleri"
        description="Tarih aralığına göre giriş, çıkış ve bakiye. Alış faturası onayı ve satış siparişleri otomatik işlenir."
      />
      <StockReportView
        from={from}
        to={to}
        initialSummary={summary.rows}
        initialLedger={ledger.rows.map((r) => ({ ...r, occurredAt: r.occurredAt.toISOString() }))}
      />
      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">Fatura satırı eşlemeleri</h2>
        <StockInvoiceMappingsManager mappings={mappings} stockItems={stockItems} />
      </section>
    </div>
  );
}
