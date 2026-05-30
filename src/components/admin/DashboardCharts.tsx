import { formatTry } from "@/lib/admin/money";
import { ORDER_STATUSES } from "@/lib/admin/marketplace-platforms";
import type { DashboardChartPoint } from "@/lib/admin/nav-badges";

function statusLabel(id: string) {
  return ORDER_STATUSES.find((s) => s.id === id)?.label ?? id;
}

export function DashboardCharts({
  last7Days,
  statusBreakdown,
}: {
  last7Days: DashboardChartPoint[];
  statusBreakdown: { status: string; count: number }[];
}) {
  const maxRevenue = Math.max(...last7Days.map((d) => d.revenueMinor), 1);
  const maxStatus = Math.max(...statusBreakdown.map((s) => s.count), 1);

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <section className="admin-card admin-card-pad">
        <h2 className="font-semibold">Son 7 gün satış</h2>
        <p className="mt-1 text-xs text-zinc-500">Sipariş adedi ve ciro (iptal hariç)</p>
        <div className="mt-6 flex items-end justify-between gap-2" style={{ height: "10rem" }}>
          {last7Days.map((d) => {
            const h = Math.max(8, (d.revenueMinor / maxRevenue) * 100);
            return (
              <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-zinc-600">{d.orders}</span>
                <div
                  className="w-full max-w-[2.5rem] rounded-t bg-[var(--kn-brand)] opacity-85"
                  style={{ height: `${h}%` }}
                  title={`${formatTry(d.revenueMinor)} · ${d.orders} sipariş`}
                />
                <span className="truncate text-[9px] text-zinc-500">{d.label}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Toplam: {formatTry(last7Days.reduce((s, d) => s + d.revenueMinor, 0))} ·{" "}
          {last7Days.reduce((s, d) => s + d.orders, 0)} sipariş
        </p>
      </section>

      <section className="admin-card admin-card-pad">
        <h2 className="font-semibold">Sipariş durumları</h2>
        <p className="mt-1 text-xs text-zinc-500">Tüm siparişlerin dağılımı</p>
        <ul className="mt-4 space-y-3">
          {statusBreakdown
            .sort((a, b) => b.count - a.count)
            .map((s) => (
              <li key={s.status}>
                <div className="flex justify-between text-sm">
                  <span>{statusLabel(s.status)}</span>
                  <span className="font-medium">{s.count}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-[var(--kn-brand)]"
                    style={{ width: `${(s.count / maxStatus) * 100}%` }}
                  />
                </div>
              </li>
            ))}
        </ul>
        {statusBreakdown.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Henüz sipariş verisi yok.</p>
        ) : null}
      </section>
    </div>
  );
}
