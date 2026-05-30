"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatTry } from "@/lib/admin/money";
import { financeKindLabel } from "@/lib/finance/types";
import type { FinanceSummary } from "@/lib/finance/summary";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";

export function FinanceDashboardView({ summary }: { summary: FinanceSummary }) {
  const router = useRouter();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const periods = [7, 30, 90];

  async function syncOrders() {
    setSyncBusy(true);
    setSyncMsg(null);
    const res = await fetch("/api/admin/finance/sync-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sinceDays: 90 }),
    });
    const j = (await res.json()) as { result?: { created: number; skipped: number }; error?: string };
    setSyncBusy(false);
    if (res.ok && j.result) {
      setSyncMsg(`${j.result.created} sipariş aktarıldı, ${j.result.skipped} zaten kayıtlı`);
      router.refresh();
    } else {
      setSyncMsg(j.error ?? "Senkronizasyon başarısız");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((d) => (
          <Link
            key={d}
            href={`/admin/finance?days=${d}`}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              summary.periodDays === d
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            Son {d} gün
          </Link>
        ))}
        <Link href="/admin/finance/payouts" className={btnSecondary}>
          Hakediş mutabakat
        </Link>
        <Link href="/admin/finance/profitability" className={btnSecondary}>
          Kârlılık raporu
        </Link>
        <button type="button" className={btnSecondary} disabled={syncBusy} onClick={() => void syncOrders()}>
          Siparişleri aktar
        </button>
      </div>
      {syncMsg ? <p className="mt-2 text-sm text-zinc-600">{syncMsg}</p> : null}

      <div className="admin-kpi-grid mt-6">
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#16a34a" }}>
          <p className="admin-kpi-label">Gelir</p>
          <p className="admin-kpi-value">{formatTry(summary.incomeMinor)}</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#dc2626" }}>
          <p className="admin-kpi-label">Gider</p>
          <p className="admin-kpi-value">{formatTry(summary.expenseMinor)}</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#2563eb" }}>
          <p className="admin-kpi-label">Net (muhasebe)</p>
          <p className="admin-kpi-value">{formatTry(summary.netMinor)}</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#059669" }}>
          <p className="admin-kpi-label">Tahmini net kâr</p>
          <p className="admin-kpi-value">
            {summary.profitability.estimatedNetProfitMinor != null
              ? formatTry(summary.profitability.estimatedNetProfitMinor)
              : "—"}
          </p>
          <Link href="/admin/finance/profitability" className="admin-kpi-link">
            Kârlılık raporu →
          </Link>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "#0d9488" }}>
          <p className="admin-kpi-label">Gerçek net kâr</p>
          <p className="admin-kpi-value">
            {summary.profitability.actualNetProfitMinor != null
              ? formatTry(summary.profitability.actualNetProfitMinor)
              : "—"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Onaylı kesintilerle</p>
        </div>
        <div className="admin-kpi" style={{ ["--kpi-accent" as string]: "var(--kn-brand)" }}>
          <p className="admin-kpi-label">Pazaryeri alacağı</p>
          <p className="admin-kpi-value">{formatTry(summary.marketplaceReceivableMinor)}</p>
          <Link href="/admin/finance/reconciliation" className="admin-kpi-link">
            Mutabakat →
          </Link>
        </div>
      </div>

      {(summary.profitability.varianceOrders > 0 ||
        summary.unmatchedDeductions > 0 ||
        summary.openReconciliationOrders > 0) && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">Dikkat — mutabakat bekleyen kayıtlar</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {summary.profitability.varianceOrders > 0 ? (
              <li>
                {summary.profitability.varianceOrders} siparişte tahmin/gerçek fark var —{" "}
                <Link href="/admin/finance/profitability" className="underline">
                  kârlılık raporu
                </Link>
              </li>
            ) : null}
            {summary.unmatchedDeductions > 0 ? (
              <li>
                {summary.unmatchedDeductions} eşleşmemiş pazaryeri kesinti faturası —{" "}
                <Link href="/admin/finance/reconciliation" className="underline">
                  mutabakat sayfası
                </Link>
              </li>
            ) : null}
            {summary.openReconciliationOrders > 0 ? (
              <li>{summary.openReconciliationOrders} pazaryeri satışı kesinti bekliyor</li>
            ) : null}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/admin/finance/transactions/new?kind=expense" className={btnPrimary}>
          Gider ekle
        </Link>
        <Link href="/admin/finance/transactions/new?kind=marketplace_deduction" className={btnSecondary}>
          Pazaryeri kesinti faturası
        </Link>
        <Link href="/admin/finance/transactions/new?kind=marketplace_payout" className={btnSecondary}>
          Pazaryeri hakediş
        </Link>
        <Link href="/admin/finance/payouts" className={btnSecondary}>
          Hakediş içe aktar
        </Link>
        <Link href="/admin/finance/transactions" className={btnSecondary}>
          Tüm hareketler
        </Link>
      </div>

      <section className="admin-card admin-card-pad mt-8">
        <h2 className="font-semibold">Son hareketler</h2>
        {summary.recentTransactions.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Henüz kayıt yok. Siparişleri aktarın veya manuel hareket ekleyin.
          </p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2">Tarih</th>
                <th className="pb-2">Tür</th>
                <th className="pb-2">Açıklama</th>
                <th className="pb-2 text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentTransactions.map((t) => (
                <tr key={t.id} className="border-b border-zinc-100">
                  <td className="py-2 pr-2 whitespace-nowrap">
                    {new Date(t.txDate).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="py-2 pr-2">{financeKindLabel(t.kind)}</td>
                  <td className="py-2 pr-2">{t.description}</td>
                  <td className="py-2 text-right tabular-nums">{formatTry(t.amountMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
