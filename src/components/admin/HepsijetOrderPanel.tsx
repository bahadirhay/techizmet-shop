"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import type { HepsijetOrderShipmentMeta } from "@/lib/shipping/hepsijet/types";

export function HepsijetOrderPanel({
  orderId,
  marketplacePlatform,
  showHepsijet,
}: {
  orderId: string;
  marketplacePlatform: string | null;
  showHepsijet: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [meta, setMeta] = useState<HepsijetOrderShipmentMeta | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isHepsijet = showHepsijet || meta?.provider === "hepsijet";

  async function load() {
    const res = await fetch(`/api/admin/orders/${orderId}/hepsijet`);
    if (!res.ok) return;
    const j = (await res.json()) as {
      ready?: boolean;
      missing?: string[];
      meta?: HepsijetOrderShipmentMeta | null;
    };
    setReady(Boolean(j.ready));
    setMissing(j.missing ?? []);
    setMeta(j.meta ?? null);
  }

  useEffect(() => {
    void load();
  }, [orderId]);

  if (marketplacePlatform || !isHepsijet) return null;

  async function run(method: "POST" | "PATCH" | "PUT", label: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/orders/${orderId}/hepsijet`, { method });
    const j = (await res.json()) as { error?: string; meta?: HepsijetOrderShipmentMeta };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "İşlem başarısız");
      return;
    }
    setMeta(j.meta ?? null);
    setMsg(label);
    await load();
  }

  const labelHref = meta?.labelPdfBase64
    ? `data:application/pdf;base64,${meta.labelPdfBase64}`
    : null;

  return (
    <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50/50 p-6">
      <h2 className="font-semibold text-violet-950">HepsiJet API</h2>
      {!ready ? (
        <p className="mt-2 text-sm text-amber-900">
          HepsiJet API ayarları eksik: {missing.join(", ") || "—"}.{" "}
          <Link href="/admin/shipping" className="underline">
            Kargo firmaları →
          </Link>
        </p>
      ) : (
        <p className="mt-1 text-sm text-zinc-600">
          Doğrudan HepsiJet API ile gönderi oluşturun, etiket alın ve takip numarasını kaydedin.
        </p>
      )}

      {meta?.customerDeliveryNo ? (
        <dl className="mt-3 grid gap-1 text-sm">
          <div>
            <dt className="text-zinc-500">Takip / barkod</dt>
            <dd className="font-mono">{meta.customerDeliveryNo}</dd>
          </div>
          {meta.status ? (
            <div>
              <dt className="text-zinc-500">Durum</dt>
              <dd>{meta.status}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={busy || !ready} onClick={() => void run("POST", "Gönderi oluşturuldu")}>
          {busy ? "Çalışıyor…" : meta?.customerDeliveryNo ? "Yeniden oluştur" : "Gönderi oluştur"}
        </button>
        <button type="button" className={btnSecondary} disabled={busy || !meta?.customerDeliveryNo} onClick={() => void run("PUT", "Etiket güncellendi")}>
          Etiket al
        </button>
        <button type="button" className={btnSecondary} disabled={busy || !meta?.customerDeliveryNo} onClick={() => void run("PATCH", "Durum güncellendi")}>
          Durumu yenile
        </button>
        {labelHref ? (
          <a href={labelHref} download={`hepsijet-${meta?.customerDeliveryNo}.pdf`} className={btnSecondary}>
            PDF indir
          </a>
        ) : null}
      </div>
      {msg ? <p className="mt-2 text-sm text-zinc-600">{msg}</p> : null}
    </div>
  );
}
