"use client";

import Link from "next/link";
import { formatTry } from "@/lib/admin/money";
import type { ProductProfitRow, ProfitabilityReport } from "@/lib/finance/profitability";
import { btnSecondary } from "@/components/admin/AdminForm";

const EVA_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Fatura bekliyor", className: "bg-amber-100 text-amber-900" },
  ok: { label: "Uyumlu", className: "bg-emerald-100 text-emerald-800" },
  variance: { label: "Fark var", className: "bg-red-100 text-red-800" },
};

function perUnitMinor(totalMinor: number, qty: number): number | null {
  if (qty <= 0 || totalMinor === 0) return null;
  return Math.round(totalMinor / qty);
}

function MoneyCell({
  totalMinor,
  perUnitMinor,
  sub,
  emphasize,
  tone,
}: {
  totalMinor: number;
  perUnitMinor?: number | null;
  sub?: string;
  emphasize?: boolean;
  tone?: "profit" | "loss" | "default";
}) {
  if (totalMinor === 0 && !sub) return <span className="text-zinc-400">—</span>;
  const toneClass =
    tone === "profit" ? "text-emerald-700" : tone === "loss" ? "text-red-700" : "text-zinc-900";

  return (
    <div className="text-right">
      <div className={`tabular-nums ${emphasize ? "font-semibold" : ""} ${toneClass}`}>
        {formatTry(totalMinor)}
      </div>
      {perUnitMinor != null ? (
        <div className="mt-0.5 text-xs text-zinc-500 tabular-nums">{formatTry(perUnitMinor)} / adet</div>
      ) : null}
      {sub ? <div className="mt-0.5 text-xs text-zinc-500">{sub}</div> : null}
    </div>
  );
}

function CostBreakdownCell({
  qtySold,
  productCostMinor,
  operatingCostMinor,
  costMinor,
  deductionsMinor,
}: {
  qtySold: number;
  productCostMinor: number;
  operatingCostMinor: number;
  costMinor: number;
  deductionsMinor?: number;
}) {
  if (costMinor <= 0) return <>—</>;
  const unitProduct = perUnitMinor(productCostMinor, qtySold);
  const parts: string[] = [];
  if (qtySold > 0 && unitProduct != null) parts.push(`${qtySold} × ${formatTry(unitProduct)} ürün`);
  if (operatingCostMinor > 0) parts.push(`${formatTry(operatingCostMinor)} paket/kart/kargo`);
  if (deductionsMinor && deductionsMinor > 0) parts.push(`${formatTry(deductionsMinor)} pazaryeri kesintisi ayrı`);

  return (
    <MoneyCell
      totalMinor={costMinor}
      perUnitMinor={perUnitMinor(costMinor, qtySold)}
      sub={parts.length ? parts.join(" + ") : undefined}
    />
  );
}

function ProductProfitRowView({ p }: { p: ProductProfitRow }) {
  const unitProfit =
    p.netProfitMinor != null && p.qtySold > 0 ? Math.round(p.netProfitMinor / p.qtySold) : null;
  const lowMargin = p.marginPercent != null && p.marginPercent < 15;
  const profitTone =
    p.netProfitMinor == null ? "default" : p.netProfitMinor >= 0 ? "profit" : "loss";

  return (
    <tr className="border-b border-zinc-100 align-top">
      <td className="py-3 pr-3 font-medium max-w-[220px]">
        {p.productId ? (
          <Link href={`/admin/products/${p.productId}/edit`} className="text-[var(--kn-brand)] underline">
            {p.title}
          </Link>
        ) : (
          p.title
        )}
        {lowMargin && p.productId ? (
          <p className="mt-1 text-xs font-normal text-amber-800">
            Düşük marj — ürün maliyetini kontrol edin
          </p>
        ) : null}
      </td>
      <td className="py-3 text-right tabular-nums">{p.qtySold}</td>
      <td className="py-3">
        <MoneyCell totalMinor={p.grossMinor} perUnitMinor={perUnitMinor(p.grossMinor, p.qtySold)} />
      </td>
      <td className="py-3">
        <CostBreakdownCell
          qtySold={p.qtySold}
          productCostMinor={p.productCostMinor}
          operatingCostMinor={p.operatingCostMinor}
          costMinor={p.costMinor}
          deductionsMinor={p.deductionsMinor}
        />
      </td>
      <td className="py-3">
        <MoneyCell
          totalMinor={p.netProfitMinor ?? 0}
          emphasize
          tone={profitTone}
          sub={p.deductionsMinor > 0 ? `Kesinti ${formatTry(p.deductionsMinor)} düşüldü` : undefined}
        />
      </td>
      <td className="py-3">
        {unitProfit != null ? (
          <MoneyCell totalMinor={unitProfit} emphasize tone={profitTone} />
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </td>
      <td className="py-3 text-right tabular-nums">
        {p.marginPercent != null ? (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              p.marginPercent >= 30
                ? "bg-emerald-100 text-emerald-800"
                : p.marginPercent >= 15
                  ? "bg-amber-100 text-amber-900"
                  : "bg-red-100 text-red-800"
            }`}
          >
            %{p.marginPercent}
          </span>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}

export function FinanceProfitabilityView({ report }: { report: ProfitabilityReport }) {
  const periods = [7, 30, 90];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((d) => (
          <Link
            key={d}
            href={`/admin/finance/profitability?days=${d}`}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              report.periodDays === d
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            Son {d} gün
          </Link>
        ))}
        <Link href="/admin/finance/reconciliation" className={btnSecondary}>
          Mutabakat →
        </Link>
      </div>

      <div className="admin-kpi-grid mt-6">
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#2563eb" }}>
          <p className="admin-kpi-label">Brüt ciro</p>
          <p className="admin-kpi-value">{formatTry(report.totals.grossMinor)}</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#16a34a" }}>
          <p className="admin-kpi-label">Tahmini net kâr</p>
          <p className="admin-kpi-value">
            {report.totals.estimatedNetProfitMinor != null
              ? formatTry(report.totals.estimatedNetProfitMinor)
              : "—"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Kargo, komisyon ve maliyet dahil</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#059669" }}>
          <p className="admin-kpi-label">Gerçek net kâr</p>
          <p className="admin-kpi-value">
            {report.totals.actualNetProfitMinor != null
              ? formatTry(report.totals.actualNetProfitMinor)
              : "—"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Onaylı kesintilerle</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "var(--kn-brand)" }}>
          <p className="admin-kpi-label">Bekleyen hakediş</p>
          <p className="admin-kpi-value">{formatTry(report.totals.pendingReceivableMinor)}</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#dc2626" }}>
          <p className="admin-kpi-label">Tahmin/gerçek fark</p>
          <p className="admin-kpi-value">{report.totals.varianceOrders} sipariş</p>
        </div>
      </div>

      <section className="admin-card admin-card-pad mt-8 overflow-x-auto">
        <h2 className="font-semibold">Sipariş bazlı kârlılık</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Dönem içi siparişler (en fazla 200). Detay kırılımı için siparişe tıklayın — tam P&amp;L sipariş
          sayfasında.
        </p>
        {report.ordersByProfit.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Bu dönemde sipariş yok.</p>
        ) : (
          <table className="mt-4 w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2">Sipariş</th>
                <th className="pb-2">Kanal</th>
                <th className="pb-2">Tarih</th>
                <th className="pb-2 text-right">Brüt</th>
                <th className="pb-2 text-right">Kesinti</th>
                <th className="pb-2 text-right">Maliyet</th>
                <th className="pb-2 text-right">Net kâr</th>
                <th className="pb-2 text-right">Marj</th>
              </tr>
            </thead>
            <tbody>
              {report.ordersByProfit.map((o) => {
                const profitTone =
                  o.netProfitMinor == null
                    ? "default"
                    : o.netProfitMinor >= 0
                      ? "profit"
                      : "loss";
                return (
                  <tr key={o.orderId} className="border-b border-zinc-100">
                    <td className="py-2 font-medium">
                      <Link
                        href={`/admin/orders/${o.orderId}`}
                        className="text-[var(--kn-brand)] underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="py-2">{o.label}</td>
                    <td className="py-2 text-zinc-500 whitespace-nowrap">
                      {new Date(o.orderDate).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatTry(o.grossMinor)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {o.deductionsMinor > 0 ? (
                        <span>
                          {formatTry(o.deductionsMinor)}
                          {!o.hasConfirmedDeductions ? (
                            <span className="ml-1 text-xs text-amber-700">(tahmini)</span>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {o.costMinor > 0 ? formatTry(o.costMinor) : "—"}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {o.netProfitMinor != null ? (
                        <span
                          className={
                            profitTone === "profit"
                              ? "text-emerald-700"
                              : profitTone === "loss"
                                ? "text-red-700"
                                : undefined
                          }
                        >
                          {formatTry(o.netProfitMinor)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {o.marginPercent != null ? `%${o.marginPercent}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-card admin-card-pad mt-8 overflow-x-auto">
        <h2 className="font-semibold">Kanal kârlılığı</h2>
        <p className="mt-1 text-xs text-zinc-500">Web vs pazaryeri — brüt, kesinti, toplam maliyet (ürün + paket + kart), net marj</p>
        {report.channels.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Bu dönemde sipariş yok.</p>
        ) : (
          <table className="mt-4 w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2">Kanal</th>
                <th className="pb-2 text-right">Sipariş</th>
                <th className="pb-2 text-right">Brüt</th>
                <th className="pb-2 text-right">Tahmini kesinti</th>
                <th className="pb-2 text-right">Onaylı kesinti</th>
                <th className="pb-2 text-right">Toplam maliyet</th>
                <th className="pb-2 text-right">Net kâr</th>
                <th className="pb-2 text-right">Marj</th>
              </tr>
            </thead>
            <tbody>
              {report.channels.map((c) => (
                <tr key={c.channel} className="border-b border-zinc-100">
                  <td className="py-2 font-medium">{c.label}</td>
                  <td className="py-2 text-right tabular-nums">{c.orderCount}</td>
                  <td className="py-2 text-right tabular-nums">{formatTry(c.grossMinor)}</td>
                  <td className="py-2 text-right tabular-nums text-amber-800">
                    {c.estimatedDeductionsMinor > 0 ? formatTry(c.estimatedDeductionsMinor) : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {c.confirmedDeductionsMinor > 0 ? formatTry(c.confirmedDeductionsMinor) : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {c.costMinor > 0 ? formatTry(c.costMinor) : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {c.netProfitMinor != null ? formatTry(c.netProfitMinor) : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {c.marginPercent != null ? `%${c.marginPercent}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {report.categories.length > 0 ? (
        <section className="admin-card admin-card-pad mt-8 overflow-x-auto">
          <h2 className="font-semibold">Kategori kârlılığı</h2>
          <p className="mt-1 text-xs text-zinc-500">Sipariş satırlarından — kesinti yalnızca pazaryeri; maliyet ürün + paket + kart payı</p>
          <table className="mt-4 w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2">Kategori</th>
                <th className="pb-2 text-right">Sipariş</th>
                <th className="pb-2 text-right">Adet</th>
                <th className="pb-2 text-right">Brüt</th>
                <th className="pb-2 text-right">Kesinti</th>
                <th className="pb-2 text-right">Toplam maliyet</th>
                <th className="pb-2 text-right">Net kâr</th>
                <th className="pb-2 text-right">Marj</th>
              </tr>
            </thead>
            <tbody>
              {report.categories.map((c) => (
                <tr key={c.categoryId ?? "__none__"} className="border-b border-zinc-100">
                  <td className="py-2 font-medium">{c.label}</td>
                  <td className="py-2 text-right tabular-nums">{c.orderCount}</td>
                  <td className="py-2 text-right tabular-nums">{c.qtySold}</td>
                  <td className="py-2 text-right tabular-nums">{formatTry(c.grossMinor)}</td>
                  <td className="py-2 text-right tabular-nums">
                    {c.deductionsMinor > 0 ? formatTry(c.deductionsMinor) : "—"}
                  </td>
                  <td className="py-2">
                    <CostBreakdownCell
                      qtySold={c.qtySold}
                      productCostMinor={c.productCostMinor}
                      operatingCostMinor={c.operatingCostMinor}
                      costMinor={c.costMinor}
                      deductionsMinor={c.deductionsMinor}
                    />
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {c.netProfitMinor != null ? formatTry(c.netProfitMinor) : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {c.marginPercent != null ? `%${c.marginPercent}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {report.topProducts.length > 0 ? (
        <section className="admin-card admin-card-pad mt-8 overflow-x-auto">
          <h2 className="font-semibold">Ürün bazlı (top 15)</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Seçilen dönemdeki satışlar toplanır.{" "}
            <strong>Toplam kâr = Brüt satış − Toplam maliyet − Pazaryeri kesintisi</strong>. Net marj = Toplam kâr ÷
            Brüt satış.
          </p>
          <p className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            Düşük marj (ör. %9) geçmiş ortalamadan değil; bu dönemde satılan adetlerin gerçek maliyet ve fiyatından
            gelir. Tavuk ayağı örneğinde ürün maliyeti (~₺189/adet) satış fiyatına (~₺239/adet) çok yakınsa marj
            düşük çıkar — ürün kartındaki <em>maliyet</em> alanını doğrulayın.
          </p>
          <table className="mt-4 w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2 pr-3">Ürün</th>
                <th className="pb-2 text-right">Adet</th>
                <th className="pb-2 text-right">Brüt satış</th>
                <th className="pb-2 text-right">Toplam maliyet</th>
                <th className="pb-2 text-right">Toplam kâr</th>
                <th className="pb-2 text-right">1 adet kâr</th>
                <th className="pb-2 text-right">Net marj</th>
              </tr>
            </thead>
            <tbody>
              {report.topProducts.map((p) => (
                <ProductProfitRowView key={p.productId ?? p.title} p={p} />
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {report.payouts.length > 0 ? (
        <section className="admin-card admin-card-pad mt-8 overflow-x-auto">
          <h2 className="font-semibold">Hakediş özeti</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Brüt satış − kesintiler − bankaya yatan hakediş = bekleyen alacak
          </p>
          <table className="mt-4 w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2">Platform</th>
                <th className="pb-2 text-right">Brüt satış</th>
                <th className="pb-2 text-right">Kesinti (gerçek/tahmini)</th>
                <th className="pb-2 text-right">Hakediş ödemesi</th>
                <th className="pb-2 text-right">Bekleyen</th>
              </tr>
            </thead>
            <tbody>
              {report.payouts.map((p) => (
                <tr key={p.platform} className="border-b border-zinc-100">
                  <td className="py-2 font-medium">{p.label}</td>
                  <td className="py-2 text-right tabular-nums">{formatTry(p.grossSalesMinor)}</td>
                  <td className="py-2 text-right tabular-nums">
                    {p.confirmedDeductionsMinor > 0
                      ? formatTry(p.confirmedDeductionsMinor)
                      : p.estimatedDeductionsMinor > 0
                        ? `${formatTry(p.estimatedDeductionsMinor)} (tahmini)`
                        : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatTry(p.payoutsMinor)}</td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {formatTry(p.pendingReceivableMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-zinc-500">
            Hakediş ödemesi kaydetmek veya Trendyol&apos;dan otomatik çekmek için{" "}
            <Link href="/admin/finance/payouts" className="underline">
              Hakediş mutabakat →
            </Link>
          </p>
        </section>
      ) : null}

      <section className="admin-card admin-card-pad mt-8 overflow-x-auto">
        <h2 className="font-semibold">Tahmin vs gerçek (kesinti)</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Otomatik tahmin ile kesinti faturası tutarını karşılaştırın
        </p>
        {report.estimateVsActual.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Pazaryeri siparişi veya tahmin yok.</p>
        ) : (
          <table className="mt-4 w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2">Sipariş</th>
                <th className="pb-2">Platform</th>
                <th className="pb-2 text-right">Tahmin</th>
                <th className="pb-2 text-right">Gerçek (fatura)</th>
                <th className="pb-2 text-right">Fark</th>
                <th className="pb-2">Durum</th>
              </tr>
            </thead>
            <tbody>
              {report.estimateVsActual.map((r) => {
                const st = EVA_STATUS[r.status] ?? EVA_STATUS.pending;
                return (
                  <tr key={r.orderId} className="border-b border-zinc-100">
                    <td className="py-2">
                      <Link href={`/admin/orders/${r.orderId}`} className="text-[var(--kn-brand)] underline">
                        {r.orderNumber}
                      </Link>
                    </td>
                    <td className="py-2">{r.platform}</td>
                    <td className="py-2 text-right tabular-nums">{formatTry(r.estimatedMinor)}</td>
                    <td className="py-2 text-right tabular-nums">
                      {r.confirmedMinor > 0 ? formatTry(r.confirmedMinor) : "—"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {r.confirmedMinor > 0 ? (
                        <span className={r.varianceMinor !== 0 ? "text-red-700" : "text-emerald-700"}>
                          {r.varianceMinor > 0 ? "+" : ""}
                          {formatTry(r.varianceMinor)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${st.className}`}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
