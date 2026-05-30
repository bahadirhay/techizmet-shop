"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatTry } from "@/lib/admin/money";
import type { OrderFinanceSnapshot } from "@/lib/finance/order-economics";
import { financeKindLabel } from "@/lib/finance/types";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";

type TxRow = {
  id: string;
  kind: string;
  amountMinor: number;
  txDate: Date;
  description: string;
  reconciliationStatus: string;
};

const RECON_LABELS: Record<string, string> = {
  estimated: "Tahmini",
  matched: "Eşleşti",
  open: "Açık",
  unmatched: "Eşleşmedi",
  reviewed: "İncelendi",
};

export function OrderFinancePanel({
  orderId,
  orderNumber,
  marketplacePlatform,
  financeSnapshot,
  transactions,
}: {
  orderId: string;
  orderNumber: string;
  marketplacePlatform: string | null;
  financeSnapshot: OrderFinanceSnapshot | null;
  transactions: TxRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const income = transactions.find((t) => t.kind === "sale_income");
  const deductions = transactions.filter((t) => t.kind === "marketplace_deduction");
  const estimatedDeductions = deductions.filter((d) => d.reconciliationStatus === "estimated");
  const confirmedDeductions = deductions.filter((d) => d.reconciliationStatus !== "estimated");
  const totalDeductionMinor = deductions.reduce((s, d) => s + d.amountMinor, 0);

  async function syncOrder() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/finance/sync-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const j = (await res.json()) as { result?: { created: number }; error?: string };
    setBusy(false);
    if (res.ok) {
      setMsg(j.result?.created ? "Satış geliri oluşturuldu" : "Güncellendi / zaten kayıtlı");
      router.refresh();
    } else {
      setMsg(j.error ?? "Hata");
    }
  }

  const snap = financeSnapshot;
  const netFromSnap =
    snap?.expectedNetProfitMinor != null
      ? snap.expectedNetProfitMinor
      : snap
        ? snap.grossMinor - snap.totalCommissionMinor - snap.shippingDeductionMinor - (snap.totalCostMinor ?? 0)
        : null;

  return (
    <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-blue-950">Ön muhasebe</h2>
          <p className="mt-1 text-xs text-blue-900">Sipariş geliri, tahmini kesintiler ve net kâr</p>
        </div>
        <Link href="/admin/finance" className="text-xs text-[var(--kn-brand)] underline">
          Muhasebe paneli →
        </Link>
      </div>

      {snap ? (
        <div className="mt-3 rounded-lg border border-blue-200 bg-white p-3 text-sm space-y-1">
          <p className="font-medium text-blue-950">Ekonomi özeti ({snap.channel})</p>
          <div className="mt-2 space-y-1 text-blue-900">
            <div className="flex justify-between gap-4">
              <span>Brüt satış</span>
              <span>{formatTry(snap.grossMinor)}</span>
            </div>
            {marketplacePlatform && snap.totalCommissionMinor > 0 ? (
              <div className="flex justify-between gap-4 text-amber-900">
                <span>Tahmini komisyon</span>
                <span>−{formatTry(snap.totalCommissionMinor)}</span>
              </div>
            ) : null}
            {marketplacePlatform && snap.shippingDeductionMinor > 0 ? (
              <div className="flex justify-between gap-4 text-amber-900">
                <span>Tahmini kargo kesintisi</span>
                <span>−{formatTry(snap.shippingDeductionMinor)}</span>
              </div>
            ) : null}
            {snap.totalCostMinor != null && snap.totalCostMinor > 0 ? (
              <div className="flex justify-between gap-4">
                <span>Ürün maliyeti</span>
                <span>−{formatTry(snap.totalCostMinor)}</span>
              </div>
            ) : snap.missingCostLines > 0 ? (
              <p className="text-xs text-amber-800">
                {snap.missingCostLines} satırda maliyet yok — net kâr eksik hesaplanır.
              </p>
            ) : null}
            {netFromSnap != null && snap.totalCostMinor ? (
              <div className="flex justify-between gap-4 border-t border-blue-100 pt-2 font-semibold">
                <span>Tahmini net kâr</span>
                <span>{formatTry(netFromSnap)}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!income ? (
        <div className="mt-3">
          <p className="text-sm text-blue-900">Bu sipariş için satış geliri kaydı yok.</p>
          <button type="button" className={`${btnPrimary} mt-2`} disabled={busy} onClick={() => void syncOrder()}>
            Gelir kaydı oluştur
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-blue-200 bg-white p-3 text-sm">
          <p>
            <span className="font-medium">{financeKindLabel(income.kind)}:</span>{" "}
            {formatTry(income.amountMinor)} · {new Date(income.txDate).toLocaleDateString("tr-TR")}
          </p>
          {marketplacePlatform && income.reconciliationStatus !== "none" ? (
            <p className="mt-1 text-xs text-zinc-500">
              Mutabakat: {RECON_LABELS[income.reconciliationStatus] ?? income.reconciliationStatus}
            </p>
          ) : null}
        </div>
      )}

      {deductions.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm">
          {deductions.map((d) => (
            <li key={d.id} className="rounded border border-blue-100 bg-white px-3 py-2">
              {d.reconciliationStatus === "estimated" ? (
                <span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                  Tahmini
                </span>
              ) : null}
              Kesinti: {formatTry(d.amountMinor)} — {d.description}
            </li>
          ))}
        </ul>
      ) : marketplacePlatform ? (
        <p className="mt-3 text-sm text-amber-900">
          Tahmini kesinti yok. Pazaryeri → komisyon kurallarını tanımlayın veya gelir kaydı oluşturun.
        </p>
      ) : null}

      {income && marketplacePlatform && totalDeductionMinor > 0 ? (
        <p className="mt-2 text-sm font-medium text-blue-950">
          Tahmini net hakediş: {formatTry(income.amountMinor - totalDeductionMinor)}
          {estimatedDeductions.length > 0 && confirmedDeductions.length === 0
            ? " (kesinti faturası gelince güncelleyin)"
            : ""}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/admin/finance/transactions/new?kind=marketplace_deduction&orderId=${orderId}`}
          className={btnSecondary}
        >
          Kesinti faturası ekle
        </Link>
        {marketplacePlatform ? (
          <Link href="/admin/finance/reconciliation" className={btnSecondary}>
            Mutabakat
          </Link>
        ) : null}
        {marketplacePlatform ? (
          <Link href={`/admin/integrations?platform=${marketplacePlatform}`} className={btnSecondary}>
            Komisyon kuralları
          </Link>
        ) : null}
      </div>

      {msg ? <p className="mt-2 text-sm text-blue-950">{msg}</p> : null}
      <p className="mt-2 text-xs text-blue-800">Sipariş: {orderNumber}</p>
    </div>
  );
}
