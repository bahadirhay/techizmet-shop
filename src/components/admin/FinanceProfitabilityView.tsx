"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatTry } from "@/lib/admin/money";
import type {
  ChannelProfitRow,
  ProductProfitRow,
  ProfitabilityReport,
} from "@/lib/finance/profitability";
import { btnSecondary, inputClass } from "@/components/admin/AdminForm";

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
      <td className="py-3 whitespace-nowrap">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
          {p.channelLabel}
        </span>
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

function ChannelSelect({
  channels,
  value,
  onChange,
}: {
  channels: ChannelProfitRow[];
  value: string;
  onChange: (value: string) => void;
}) {
  const sales = channels.filter((c) => c.group === "sales");
  const marketplaces = channels.filter((c) => c.group === "marketplace");
  return (
    <select
      className={`${inputClass} mt-1 min-w-[10rem]`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="all">Tümü</option>
      <optgroup label="Satış kanalları">
        {sales.map((c) => (
          <option key={c.channel} value={c.channel}>
            {c.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Pazaryerleri">
        {marketplaces.map((c) => (
          <option key={c.channel} value={c.channel}>
            {c.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

function ProductProfitSection({
  products,
  channels,
}: {
  products: ProductProfitRow[];
  channels: ChannelProfitRow[];
}) {
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const visible = useMemo(() => {
    const filtered =
      channelFilter === "all" ? products : products.filter((p) => p.channel === channelFilter);
    return [...filtered].sort((a, b) => b.grossMinor - a.grossMinor).slice(0, 15);
  }, [products, channelFilter]);

  return (
    <section className="admin-card admin-card-pad mt-8 overflow-x-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold">Ürün bazlı (top 15)</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Seçilen dönemdeki satışlar <strong>ürün × kanal</strong> olarak toplanır.{" "}
            <strong>Toplam kâr = Brüt satış − Toplam maliyet − Pazaryeri kesintisi</strong>. Net marj = Toplam
            kâr ÷ Brüt satış.
          </p>
        </div>
        <label className="text-xs text-zinc-500">
          Kanal
          <ChannelSelect channels={channels} value={channelFilter} onChange={setChannelFilter} />
        </label>
      </div>
      <p className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
        Aynı ürün Trendyol ve web&apos;de ayrı satırdır — kesinti ve marj kanal bazında farklıdır. Düşük marj
        ürün kartındaki <em>maliyet</em> alanından da kaynaklanabilir.
      </p>
      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Bu kanalda dönem içi ürün satışı yok.</p>
      ) : (
        <table className="mt-4 w-full min-w-[960px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-zinc-500">
              <th className="pb-2 pr-3">Ürün</th>
              <th className="pb-2">Kanal</th>
              <th className="pb-2 text-right">Adet</th>
              <th className="pb-2 text-right">Brüt satış</th>
              <th className="pb-2 text-right">Toplam maliyet</th>
              <th className="pb-2 text-right">Toplam kâr</th>
              <th className="pb-2 text-right">1 adet kâr</th>
              <th className="pb-2 text-right">Net marj</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <ProductProfitRowView key={`${p.productId ?? p.title}::${p.channel}`} p={p} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function summarizeChannels(rows: ChannelProfitRow[]): ChannelProfitRow {
  const grossMinor = rows.reduce((s, r) => s + r.grossMinor, 0);
  const orderCount = rows.reduce((s, r) => s + r.orderCount, 0);
  const estimatedDeductionsMinor = rows.reduce((s, r) => s + r.estimatedDeductionsMinor, 0);
  const confirmedDeductionsMinor = rows.reduce((s, r) => s + r.confirmedDeductionsMinor, 0);
  const costMinor = rows.reduce((s, r) => s + r.costMinor, 0);
  const active = rows.filter((r) => r.orderCount > 0);
  const netProfitMinor =
    active.length > 0 && active.every((r) => r.netProfitMinor != null)
      ? active.reduce((s, r) => s + (r.netProfitMinor ?? 0), 0)
      : null;
  return {
    channel: "all",
    label: "Tümü",
    group: "sales",
    orderCount,
    grossMinor,
    estimatedDeductionsMinor,
    confirmedDeductionsMinor,
    costMinor,
    netProfitMinor,
    marginPercent:
      netProfitMinor != null && grossMinor > 0
        ? Math.round((netProfitMinor / grossMinor) * 1000) / 10
        : null,
  };
}

function ChannelGroupLabel({ label }: { label: string }) {
  return (
    <tr className="border-b border-zinc-200 bg-zinc-50">
      <td colSpan={8} className="py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </td>
    </tr>
  );
}

function ChannelProfitTable({ channels }: { channels: ChannelProfitRow[] }) {
  const total = summarizeChannels(channels);
  const sales = channels.filter((c) => c.group === "sales");
  const marketplaces = channels.filter((c) => c.group === "marketplace");
  const hasOrders = channels.some((c) => c.orderCount > 0);

  return (
    <>
      {!hasOrders ? (
        <p className="mt-4 text-sm text-zinc-500">Bu dönemde sipariş yok. Kanallar yine de listelenir.</p>
      ) : null}
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
          <tr className="border-b border-zinc-200 bg-zinc-100 font-semibold">
            <td className="py-2">{total.label}</td>
            <ChannelProfitCells row={total} />
          </tr>
          <ChannelGroupLabel label="Satış kanalları" />
          {sales.map((c) => (
            <tr key={c.channel} className="border-b border-zinc-100">
              <td className="py-2 pl-3 font-medium">{c.label}</td>
              <ChannelProfitCells row={c} />
            </tr>
          ))}
          <ChannelGroupLabel label="Pazaryerleri" />
          {marketplaces.map((c) => (
            <tr key={c.channel} className="border-b border-zinc-100">
              <td className="py-2 pl-3 font-medium">{c.label}</td>
              <ChannelProfitCells row={c} />
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ChannelProfitCells({ row }: { row: ChannelProfitRow }) {
  return (
    <>
      <td className="py-2 text-right tabular-nums">{row.orderCount}</td>
      <td className="py-2 text-right tabular-nums">{formatTry(row.grossMinor)}</td>
      <td className="py-2 text-right tabular-nums text-amber-800">
        {row.estimatedDeductionsMinor > 0 ? formatTry(row.estimatedDeductionsMinor) : "—"}
      </td>
      <td className="py-2 text-right tabular-nums">
        {row.confirmedDeductionsMinor > 0 ? formatTry(row.confirmedDeductionsMinor) : "—"}
      </td>
      <td className="py-2 text-right tabular-nums">{row.costMinor > 0 ? formatTry(row.costMinor) : "—"}</td>
      <td className="py-2 text-right tabular-nums font-medium">
        {row.netProfitMinor != null ? formatTry(row.netProfitMinor) : "—"}
      </td>
      <td className="py-2 text-right tabular-nums">
        {row.marginPercent != null ? `%${row.marginPercent}` : "—"}
      </td>
    </>
  );
}

export function FinanceProfitabilityView({ report }: { report: ProfitabilityReport }) {
  const [orderChannel, setOrderChannel] = useState<string>("all");
  const visibleOrders = useMemo(
    () =>
      orderChannel === "all"
        ? report.ordersByProfit
        : report.ordersByProfit.filter((o) => o.channel === orderChannel),
    [report.ordersByProfit, orderChannel],
  );
  const presets: { days: number; label: string }[] = [
    { days: 7, label: "Son 7 gün" },
    { days: 30, label: "Son 30 gün" },
    { days: 90, label: "Son 90 gün" },
    { days: 365, label: "Son 1 yıl" },
  ];
  const isCustom = report.periodLabel.includes("–");

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        {presets.map((p) => {
          const active = !isCustom && report.periodDays === p.days;
          return (
            <Link
              key={p.days}
              href={`/admin/finance/profitability?days=${p.days}`}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                active
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white hover:bg-zinc-50"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
        <form
          method="get"
          action="/admin/finance/profitability"
          className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2"
        >
          <label className="text-xs text-zinc-500">
            Başlangıç
            <input
              type="date"
              name="from"
              required
              defaultValue={report.periodFrom}
              className={`${inputClass} mt-1 min-w-[9.5rem]`}
            />
          </label>
          <label className="text-xs text-zinc-500">
            Bitiş
            <input
              type="date"
              name="to"
              required
              defaultValue={report.periodTo}
              className={`${inputClass} mt-1 min-w-[9.5rem]`}
            />
          </label>
          <button
            type="submit"
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              isCustom
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100"
            }`}
          >
            Uygula
          </button>
        </form>
        <Link href="/admin/finance/reconciliation" className={btnSecondary}>
          Mutabakat →
        </Link>
      </div>
      <p className="mt-2 text-xs text-zinc-500">Dönem: {report.periodLabel}</p>

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
        <h2 className="font-semibold">Kanal kârlılığı</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Tümü, satış kanalları ve pazaryerleri ayrı satır. Brüt, kesinti, toplam maliyet (ürün + paket +
          kart), net marj.
        </p>
        <ChannelProfitTable channels={report.channels} />
      </section>

      <section className="admin-card admin-card-pad mt-8 overflow-x-auto">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Sipariş bazlı kârlılık</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Dönem içi siparişler (en fazla 200). Brüt = faturalanacak net tutar. Trendyol satıcı
              indirimi varsa Liste / İndirim sütunlarında görünür. Detay için siparişe tıklayın.
            </p>
          </div>
          <label className="text-xs text-zinc-500">
            Kanal
            <ChannelSelect channels={report.channels} value={orderChannel} onChange={setOrderChannel} />
          </label>
        </div>
        {visibleOrders.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            {report.ordersByProfit.length === 0
              ? "Bu dönemde sipariş yok."
              : "Son 200 sipariş içinde bu kanal yok."}
          </p>
        ) : (
          <table className="mt-4 w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2">Sipariş</th>
                <th className="pb-2">Kanal</th>
                <th className="pb-2">Tarih</th>
                <th className="pb-2 text-right">Liste</th>
                <th className="pb-2 text-right">İndirim</th>
                <th className="pb-2 text-right">Fatura (brüt)</th>
                <th className="pb-2 text-right">Kesinti</th>
                <th className="pb-2 text-right">Maliyet</th>
                <th className="pb-2 text-right">Net kâr</th>
                <th className="pb-2 text-right">Marj</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((o) => {
                const profitTone =
                  o.netProfitMinor == null
                    ? "default"
                    : o.netProfitMinor >= 0
                      ? "profit"
                      : "loss";
                const hasDiscount = o.discountMinor > 0;
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
                    <td className="py-2 text-right tabular-nums text-zinc-500">
                      {hasDiscount ? formatTry(o.listMinor) : "—"}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {hasDiscount ? (
                        <span className="text-amber-800">−{formatTry(o.discountMinor)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {formatTry(o.grossMinor)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {o.deductionsMinor > 0 ? (
                        <span>
                          {formatTry(o.deductionsMinor)}
                          {o.hasPartialDeductions ? (
                            <span className="ml-1 text-xs text-amber-700">(kısmi)</span>
                          ) : !o.hasConfirmedDeductions ? (
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
        <ProductProfitSection products={report.topProducts} channels={report.channels} />
      ) : null}

      {report.payouts.length > 0 ? (
        <section className="admin-card admin-card-pad mt-8 overflow-x-auto">
          <h2 className="font-semibold">Hakediş özeti</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Her pazaryeri ayrı satır. Brüt satış − kesintiler − bankaya yatan hakediş = bekleyen alacak.
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
              <tr className="border-b border-zinc-200 bg-zinc-50 font-semibold">
                <td className="py-2">Tümü</td>
                <td className="py-2 text-right tabular-nums">
                  {formatTry(report.payouts.reduce((s, p) => s + p.grossSalesMinor, 0))}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatTry(
                    report.payouts.reduce(
                      (s, p) => s + p.confirmedDeductionsMinor + p.estimatedDeductionsMinor,
                      0,
                    ),
                  )}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatTry(report.payouts.reduce((s, p) => s + p.payoutsMinor, 0))}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatTry(report.payouts.reduce((s, p) => s + p.pendingReceivableMinor, 0))}
                </td>
              </tr>
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
          Trendyol hakediş kırılımı (komisyon + kargo + platform + stopaj) geldiyse kaynak TY
          kabul edilir ve uyumlu sayılır. Amazon vb. için fatura/kesinti onayı beklenir.
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
