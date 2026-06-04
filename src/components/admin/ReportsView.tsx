import Link from "next/link";
import { DashboardCharts } from "@/components/admin/DashboardCharts";
import { formatTry } from "@/lib/admin/money";
import { ORDER_STATUSES } from "@/lib/admin/marketplace-platforms";
import { orderSourceBadgeClass, ordersListHref } from "@/lib/marketplace/order-source";
import type { SalesReport, SalesReportPeriod } from "@/lib/admin/sales-report";

function statusLabel(id: string) {
  return ORDER_STATUSES.find((s) => s.id === id)?.label ?? id;
}

function paymentLabel(id: string) {
  const map: Record<string, string> = {
    cod: "Kapıda ödeme",
    bank: "Havale / EFT",
    card: "Kredi kartı",
    other: "Diğer",
  };
  return map[id] ?? id;
}

export function ReportsView({ report }: { report: SalesReport }) {
  const periods: SalesReportPeriod[] = [7, 30, 90];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((d) => (
          <Link
            key={d}
            href={`/admin/reports?days=${d}`}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              report.periodDays === d
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            Son {d} gün
          </Link>
        ))}
        <a
          href={`/api/admin/reports/export?days=${report.periodDays}`}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
        >
          CSV indir
        </a>
      </div>

      <div className="admin-kpi-grid mt-6">
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#2563eb" }}>
          <p className="admin-kpi-label">Ciro</p>
          <p className="admin-kpi-value">{formatTry(report.totals.revenueMinor)}</p>
          <p className="admin-kpi-meta">{report.totals.orders} sipariş</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#16a34a" }}>
          <p className="admin-kpi-label">Ortalama sepet</p>
          <p className="admin-kpi-value">{formatTry(report.totals.avgOrderMinor)}</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "var(--kn-brand)" }}>
          <p className="admin-kpi-label">Yeni müşteri</p>
          <p className="admin-kpi-value">{report.totals.newCustomers}</p>
          <Link href="/admin/customers" className="admin-kpi-link">
            Müşteri listesi →
          </Link>
        </div>
      </div>

      <DashboardCharts
        last7Days={report.chart}
        statusBreakdown={report.statusBreakdown}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="admin-card admin-card-pad">
          <h2 className="font-semibold">En çok satan ürünler</h2>
          <p className="mt-1 text-xs text-zinc-500">Dönem içi satır kalemleri (iptal hariç)</p>
          {report.topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Henüz satış verisi yok.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-zinc-500">
                  <th className="pb-2">Ürün</th>
                  <th className="pb-2 text-right">Adet</th>
                  <th className="pb-2 text-right">Ciro</th>
                </tr>
              </thead>
              <tbody>
                {report.topProducts.map((p) => (
                  <tr key={p.title} className="border-b border-zinc-100">
                    <td className="py-2 pr-2">{p.title}</td>
                    <td className="py-2 text-right tabular-nums">{p.qty}</td>
                    <td className="py-2 text-right tabular-nums">{formatTry(p.revenueMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="admin-card admin-card-pad">
          <h2 className="font-semibold">Satış kaynağı</h2>
          <p className="mt-1 text-xs text-zinc-500">Web sitesi ve pazaryeri kanalları</p>
          {report.orderSources.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Veri yok.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {report.orderSources.map((s) => {
                const totalRev = report.totals.revenueMinor || 1;
                const pct = Math.round((s.revenueMinor / totalRev) * 100);
                const filterSource = s.sourceId === "web" ? "web" : s.sourceId;
                return (
                  <li key={s.sourceId}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${orderSourceBadgeClass(s.sourceId === "web" ? null : s.sourceId)}`}
                        >
                          {s.label}
                        </span>
                        <span className="text-zinc-500">({s.count})</span>
                      </span>
                      <span className="font-medium tabular-nums">{formatTry(s.revenueMinor)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-[var(--kn-brand)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <Link
                      href={ordersListHref({ source: filterSource })}
                      className="mt-1 inline-block text-xs text-[var(--kn-brand)] hover:underline"
                    >
                      Siparişleri gör →
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="admin-card admin-card-pad">
          <h2 className="font-semibold">Ödeme yöntemi</h2>
          <p className="mt-1 text-xs text-zinc-500">Sipariş sayısı ve ciro</p>
          {report.paymentMethods.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">Veri yok.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {report.paymentMethods.map((p) => (
                <li key={p.method} className="flex justify-between text-sm">
                  <span>{paymentLabel(p.method)}</span>
                  <span className="text-right">
                    <span className="font-medium">{formatTry(p.revenueMinor)}</span>
                    <span className="ml-2 text-zinc-500">({p.count})</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        Detaylı sipariş listesi için{" "}
        <Link href="/admin/orders" className="text-[var(--kn-brand)] underline">
          Siparişler
        </Link>
        . Raporlar site başına DB kaydından üretilir (
        <code>STORE_SITE_SLUG</code> / ayrı Neon).
      </p>
    </div>
  );
}
