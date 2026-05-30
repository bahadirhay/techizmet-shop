"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnSecondary } from "@/components/admin/AdminForm";

export function MarketplaceOrderPanel({
  orderId,
  platform,
  metaJson,
}: {
  orderId: string;
  platform: string;
  metaJson: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  let meta: {
    shipmentPackageId?: number | string;
    packageNumber?: string;
    orderNumber?: string;
    amazonOrderId?: string;
    tyStatus?: string;
    hbStatus?: string;
    orderStatus?: string;
  } = {};
  try {
    meta = JSON.parse(metaJson) as typeof meta;
  } catch {
    meta = {};
  }

  async function approve() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/orders/${orderId}/marketplace/approve`, { method: "POST" });
    const json = (await res.json()) as { error?: string; result?: { message: string } };
    setBusy(false);
    setMsg(res.ok ? (json.result?.message ?? "Onaylandı") : (json.error ?? "Hata"));
    if (res.ok) router.refresh();
  }

  const platformLabel =
    platform === "trendyol"
      ? "Trendyol"
      : platform === "hepsiburada"
        ? "Hepsiburada"
        : platform === "amazon_tr"
          ? "Amazon"
          : platform;

  const refLabel =
    platform === "amazon_tr"
      ? meta.amazonOrderId ?? meta.orderNumber ?? "—"
      : platform === "hepsiburada"
        ? meta.packageNumber ?? meta.orderNumber ?? "—"
        : String(meta.shipmentPackageId ?? meta.packageNumber ?? "—");

  const statusLabel = meta.tyStatus ?? meta.hbStatus ?? meta.orderStatus ?? "—";

  return (
    <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="font-semibold text-amber-950">Pazaryeri — {platformLabel}</h2>
      <p className="mt-1 text-xs text-amber-900">
        Ref #{refLabel} · sipariş {meta.orderNumber ?? meta.amazonOrderId ?? "—"} · durum: {statusLabel}
      </p>
      {platform === "trendyol" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => void approve()}>
            Trendyol&apos;da onayla (Picking)
          </button>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-amber-900">
        e-Arşiv faturası için yukarıdaki <strong>GİB e-Arşiv fatura</strong> panelini kullanın.
        {platform === "trendyol" ? " Kesim sonrası Trendyol'a otomatik iletilebilir." : null}
      </p>
      {msg ? <p className="mt-2 text-sm text-amber-950">{msg}</p> : null}
    </div>
  );
}
