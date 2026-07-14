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

/** "200", "200,50", "1.250,00" gibi TL girişini kuruşa çevirir. Boş/geçersiz → null. */
function tlToMinor(input: string): number | null {
  let c = input.trim().replace(/\s/g, "");
  if (!c) return null;
  // Virgül varsa: nokta binlik, virgül ondalık. Yoksa nokta ondalık kabul edilir.
  if (c.includes(",")) c = c.replace(/\./g, "").replace(",", ".");
  c = c.replace(/[^0-9.]/g, "");
  if (!c) return null;
  const n = Number(c);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function OrderFinancePanel({
  orderId,
  orderNumber,
  marketplacePlatform,
  paymentMethod,
  financeSnapshot,
  transactions,
  openAccountInvoice,
}: {
  orderId: string;
  orderNumber: string;
  marketplacePlatform: string | null;
  paymentMethod?: string | null;
  financeSnapshot: OrderFinanceSnapshot | null;
  transactions: TxRow[];
  openAccountInvoice?: {
    id: string;
    status: string;
    dueDate: Date | null;
    totalMinor: number;
    issueDate: Date;
  } | null;
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
  const paymentFeeMinor = snap?.paymentFeeMinor ?? 0;
  const cardFeeTx = transactions.filter(
    (t) => t.kind === "expense" && t.description.includes("Tahmini kart komisyonu"),
  );
  const netFromSnap =
    snap?.expectedNetProfitMinor != null
      ? snap.expectedNetProfitMinor
      : snap
        ? snap.grossMinor -
          snap.totalCommissionMinor -
          snap.shippingDeductionMinor -
          (snap.shippingCostMinor ?? 0) -
          (snap.packagingCostMinor ?? 0) -
          paymentFeeMinor -
          (snap.totalCostMinor ?? 0)
        : null;

  const estimatedMarketplaceDeductionMinor = snap
    ? snap.totalCommissionMinor + snap.shippingDeductionMinor
    : 0;
  const confirmedDeductionMinor = confirmedDeductions.reduce((s, d) => s + d.amountMinor, 0);
  const effectiveMarketplaceDeductionMinor =
    confirmedDeductionMinor > 0 ? confirmedDeductionMinor : estimatedMarketplaceDeductionMinor;
  const productCostMinor = snap?.totalCostMinor ?? 0;

  const actualNetMinor = snap
    ? marketplacePlatform
      ? snap.grossMinor - effectiveMarketplaceDeductionMinor - productCostMinor
      : netFromSnap
    : null;
  const hasActualInputs = marketplacePlatform
    ? confirmedDeductionMinor > 0
    : Boolean(snap?.shippingCostActual);

  const defaultActualTry = marketplacePlatform
    ? effectiveMarketplaceDeductionMinor > 0
      ? String(effectiveMarketplaceDeductionMinor / 100)
      : ""
    : snap && (snap.shippingCostMinor ?? 0) > 0
      ? String((snap.shippingCostMinor ?? 0) / 100)
      : "";

  const [actualInput, setActualInput] = useState(defaultActualTry);
  const [savingActual, setSavingActual] = useState(false);
  const [actualMsg, setActualMsg] = useState<string | null>(null);

  async function saveActuals() {
    const minor = tlToMinor(actualInput);
    setSavingActual(true);
    setActualMsg(null);
    const payload = marketplacePlatform
      ? { marketplaceDeductionMinor: minor }
      : { shippingCostMinor: minor };
    const res = await fetch(`/api/admin/orders/${orderId}/finance-actuals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSavingActual(false);
    if (res.ok) {
      setActualMsg(minor == null ? "Temizlendi — tahmini değere dönüldü" : "Kaydedildi — net kâr güncellendi");
      router.refresh();
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setActualMsg(j.error ?? "Kaydedilemedi");
    }
  }

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

      {openAccountInvoice ? (
        <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/80 p-3 text-sm">
          <p className="font-medium text-indigo-950">Açık hesap alacağı</p>
          <p className="mt-1 text-indigo-900">
            Tutar: {formatTry(openAccountInvoice.totalMinor)}
            {openAccountInvoice.dueDate ? (
              <>
                {" "}
                · Vade:{" "}
                {new Date(openAccountInvoice.dueDate).toLocaleDateString("tr-TR")}
              </>
            ) : null}
          </p>
          <p className="mt-2">
            <Link
              href={`/admin/finance/invoices`}
              className="font-medium text-[var(--kn-brand)] underline"
            >
              Ön muhasebe faturası ({openAccountInvoice.status}) →
            </Link>
            {" · "}
            <Link
              href={`/admin/finance/cari`}
              className="text-[var(--kn-brand)] underline"
            >
              Cari listesi
            </Link>
          </p>
        </div>
      ) : paymentMethod === "open_account" ? (
        <p className="mt-3 text-sm text-amber-800">
          Açık hesap siparişi — alacak faturası oluşturulamadıysa sipariş loglarını kontrol edin.
        </p>
      ) : null}

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
            {!marketplacePlatform && (snap.shippingCostMinor ?? 0) > 0 ? (
              <div className="flex justify-between gap-4 text-amber-900">
                <span>
                  Kargo maliyeti (sizin gideriniz)
                  {snap.shippingMinor > 0
                    ? ` — müşteri ${formatTry(snap.shippingMinor)} ödedi`
                    : " — müşteri ücretsiz kargo"}
                </span>
                <span>−{formatTry(snap.shippingCostMinor ?? 0)}</span>
              </div>
            ) : null}
            {!marketplacePlatform && (snap.packagingCostMinor ?? 0) > 0 ? (
              <div className="flex justify-between gap-4 text-amber-900">
                <span>Paketleme gideri</span>
                <span>−{formatTry(snap.packagingCostMinor ?? 0)}</span>
              </div>
            ) : null}
            {paymentFeeMinor > 0 ? (
              <div className="flex justify-between gap-4 text-amber-900">
                <span>
                  Tahmini kart komisyonu
                  {snap.paymentFeePercent != null ? ` (%${snap.paymentFeePercent})` : ""}
                </span>
                <span>−{formatTry(paymentFeeMinor)}</span>
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
            {netFromSnap != null ? (
              <div className="flex justify-between gap-4 border-t border-blue-100 pt-2 font-semibold">
                <span>Tahmini net kâr</span>
                <span>
                  {snap.totalCostMinor != null && snap.totalCostMinor > 0
                    ? formatTry(netFromSnap)
                    : "Maliyet girilmedi"}
                </span>
              </div>
            ) : null}
          </div>
          {snap.lines.length > 0 ? (
            <table className="mt-3 w-full text-xs">
              <thead>
                <tr className="border-b text-left text-blue-800/80">
                  <th className="pb-1 pr-2">Kalem</th>
                  <th className="pb-1 pr-2 text-right">Satış</th>
                  <th className="pb-1 pr-2 text-right">Maliyet</th>
                  <th className="pb-1 text-right">Komisyon</th>
                </tr>
              </thead>
              <tbody>
                {snap.lines.map((line, i) => (
                  <tr key={`${line.productId ?? line.title}-${i}`} className="border-b border-blue-50">
                    <td className="py-1 pr-2">
                      <div>
                        {line.title}
                        {line.qty > 1 ? ` ×${line.qty}` : ""}
                        {line.lineKind === "bundle" ? (
                          <span className="ml-1 text-[10px] text-violet-700">paket</span>
                        ) : null}
                      </div>
                      {line.componentCosts?.map((c, j) => (
                        <div key={j} className="pl-2 text-[10px] text-blue-800/70">
                          ↳ {c.title} ×{c.qty}
                          {c.costMinor != null && c.costMinor > 0
                            ? ` · ${formatTry(c.costMinor * c.qty)}`
                            : ""}
                        </div>
                      ))}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums">{formatTry(line.lineMinor)}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">
                      {line.costMinor != null && line.costMinor > 0
                        ? formatTry(
                            line.lineKind === "bundle"
                              ? line.costMinor
                              : line.costMinor * line.qty,
                          )
                        : "—"}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {line.commissionMinor > 0 ? `−${formatTry(line.commissionMinor)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-sm">
        <p className="font-medium text-emerald-950">Gerçek değerler · net kâr</p>
        <p className="mt-1 text-xs text-emerald-900">
          {marketplacePlatform
            ? "Pazaryeri kesinti/komisyon faturasındaki gerçek toplam tutarı girin (komisyon + kargo). Net kâr bu tutarla hesaplanır."
            : "Bu sipariş için gerçekte ödediğiniz kargo bedelini girin. Net kâr bu tutarla hesaplanır."}
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-emerald-900">
              {marketplacePlatform ? "Gerçek pazaryeri kesintisi (₺)" : "Gerçek kargo bedeli (₺)"}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={actualInput}
              onChange={(e) => setActualInput(e.target.value)}
              placeholder={marketplacePlatform ? "örn. 45,80" : "örn. 200"}
              className="w-40 rounded border border-emerald-300 bg-white px-2 py-1 text-sm"
            />
          </label>
          <button
            type="button"
            className={btnPrimary}
            disabled={savingActual}
            onClick={() => void saveActuals()}
          >
            {savingActual ? "Kaydediliyor…" : "Kaydet"}
          </button>
          {hasActualInputs ? (
            <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-900">
              Gerçek değer girildi
            </span>
          ) : (
            <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">
              Şu an tahmini değer kullanılıyor
            </span>
          )}
        </div>
        {snap && actualNetMinor != null ? (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-white px-3 py-2">
            <span className="font-medium text-emerald-950">
              {hasActualInputs ? "Net kâr / zarar (gerçek)" : "Net kâr / zarar (tahmini)"}
            </span>
            {productCostMinor > 0 ? (
              <span
                className={`text-base font-semibold ${actualNetMinor >= 0 ? "text-emerald-700" : "text-red-600"}`}
              >
                {formatTry(actualNetMinor)}
              </span>
            ) : (
              <span className="text-xs text-amber-800">Ürün maliyeti girilmedi — net kâr eksik</span>
            )}
          </div>
        ) : null}
        {actualMsg ? <p className="mt-2 text-xs text-emerald-900">{actualMsg}</p> : null}
      </div>

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

      {cardFeeTx.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm">
          {cardFeeTx.map((d) => (
            <li key={d.id} className="rounded border border-blue-100 bg-white px-3 py-2">
              <span className="mr-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                Tahmini
              </span>
              Kart komisyonu: {formatTry(d.amountMinor)} — {d.description}
            </li>
          ))}
        </ul>
      ) : null}

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
