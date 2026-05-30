"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatTry } from "@/lib/admin/money";
import type { ReconciliationRow, UnmatchedDeduction } from "@/lib/finance/reconciliation";
import { btnSecondary, inputClass } from "@/components/admin/AdminForm";

const STATUS_LABELS: Record<ReconciliationRow["status"], string> = {
  ok: "Tamam",
  missing_deduction: "Kesinti eksik",
  over_deducted: "Fazla kesinti",
  no_income: "Gelir kaydı yok",
  pending_confirmation: "Tahmin — fatura bekliyor",
};

const STATUS_CLASS: Record<ReconciliationRow["status"], string> = {
  ok: "bg-emerald-100 text-emerald-800",
  missing_deduction: "bg-amber-100 text-amber-900",
  over_deducted: "bg-red-100 text-red-800",
  no_income: "bg-zinc-100 text-zinc-700",
  pending_confirmation: "bg-blue-100 text-blue-900",
};

export function MarketplaceReconciliationView({
  rows,
  unmatched,
  platform,
}: {
  rows: ReconciliationRow[];
  unmatched: UnmatchedDeduction[];
  platform?: string;
}) {
  const router = useRouter();
  const [linkOrderByDeduction, setLinkOrderByDeduction] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function linkDeduction(deductionId: string) {
    const orderId = linkOrderByDeduction[deductionId]?.trim();
    if (!orderId) {
      setMsg("Sipariş ID girin veya listeden seçin");
      return;
    }
    setBusyId(deductionId);
    setMsg(null);
    const res = await fetch(`/api/admin/finance/transactions/${deductionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkOrderId: orderId }),
    });
    const j = (await res.json()) as { error?: string; result?: { message: string } };
    setBusyId(null);
    if (res.ok) {
      setMsg(j.result?.message ?? "Bağlandı");
      router.refresh();
    } else {
      setMsg(j.error ?? "Bağlama başarısız");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/finance/reconciliation"
          className={`rounded-lg border px-3 py-1.5 text-sm ${!platform ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
        >
          Tümü
        </Link>
        {["trendyol", "hepsiburada", "amazon_tr"].map((p) => (
          <Link
            key={p}
            href={`/admin/finance/reconciliation?platform=${p}`}
            className={`rounded-lg border px-3 py-1.5 text-sm ${platform === p ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"}`}
          >
            {p === "amazon_tr" ? "Amazon" : p}
          </Link>
        ))}
        <Link
          href="/admin/finance/payouts"
          className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm text-violet-900 hover:bg-violet-100"
        >
          Hakediş mutabakat →
        </Link>
        <Link
          href="/admin/finance/profitability"
          className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm text-violet-900 hover:bg-violet-100"
        >
          Kârlılık raporu →
        </Link>
      </div>

      {msg ? <p className="mt-3 text-sm text-zinc-700">{msg}</p> : null}

      {unmatched.length > 0 ? (
        <section className="admin-card admin-card-pad mt-6 border-amber-200">
          <h2 className="font-semibold text-amber-950">Eşleşmemiş kesinti faturaları</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Trendyol / HB indirim ve komisyon faturaları — siparişe bağlanmazsa kolayca gözden kaçar
          </p>
          <div className="mt-4 space-y-3">
            {unmatched.map((u) => (
              <div key={u.id} className="rounded-lg border bg-amber-50/50 p-3 text-sm">
                <p className="font-medium">
                  {formatTry(u.amountMinor)} · {new Date(u.txDate).toLocaleDateString("tr-TR")}
                  {u.invoiceNumber ? ` · Fatura: ${u.invoiceNumber}` : null}
                </p>
                <p className="text-zinc-600">{u.description}</p>
                {u.counterpartyName ? <p className="text-zinc-500">{u.counterpartyName}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    className={`${inputClass} max-w-xs`}
                    placeholder="Sipariş ID (cuid)"
                    value={linkOrderByDeduction[u.id] ?? ""}
                    onChange={(e) =>
                      setLinkOrderByDeduction({ ...linkOrderByDeduction, [u.id]: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={busyId === u.id}
                    onClick={() => void linkDeduction(u.id)}
                  >
                    Siparişe bağla
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="admin-card admin-card-pad mt-6 overflow-x-auto">
        <h2 className="font-semibold">Pazaryeri sipariş mutabakatı</h2>
        <p className="mt-1 text-xs text-zinc-500">Son 100 sipariş — beklenen tutar vs kesintiler</p>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Pazaryeri siparişi yok.</p>
        ) : (
          <table className="mt-4 w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-zinc-500">
                <th className="pb-2">Sipariş</th>
                <th className="pb-2">Platform</th>
                <th className="pb-2 text-right">Brüt</th>
                <th className="pb-2 text-right">Tahmin</th>
                <th className="pb-2 text-right">Gerçek</th>
                <th className="pb-2 text-right">Net</th>
                <th className="pb-2">Durum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.orderId} className="border-b border-zinc-100">
                  <td className="py-2 pr-2">
                    <Link href={`/admin/orders/${r.orderId}`} className="text-[var(--kn-brand)] underline">
                      {r.orderNumber}
                    </Link>
                  </td>
                  <td className="py-2 pr-2">{r.platform}</td>
                  <td className="py-2 text-right tabular-nums">{formatTry(r.expectedMinor)}</td>
                  <td className="py-2 text-right tabular-nums text-amber-800">
                    {r.estimatedMinor > 0 ? formatTry(r.estimatedMinor) : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {r.confirmedMinor > 0 ? formatTry(r.confirmedMinor) : "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatTry(r.netMinor)}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
