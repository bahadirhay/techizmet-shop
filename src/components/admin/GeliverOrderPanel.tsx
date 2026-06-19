"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import type { GeliverOrderShipmentMeta } from "@/lib/shipping/geliver/types";

export function GeliverOrderPanel({
  orderId,
  marketplacePlatform,
}: {
  orderId: string;
  marketplacePlatform: string | null;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [shipmentReady, setShipmentReady] = useState(false);
  const [meta, setMeta] = useState<GeliverOrderShipmentMeta | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/admin/orders/${orderId}/geliver`);
    if (!res.ok) return;
    const j = (await res.json()) as {
      ready?: boolean;
      shipmentReady?: boolean;
      missing?: string[];
      meta?: GeliverOrderShipmentMeta | null;
    };
    setReady(Boolean(j.ready));
    setShipmentReady(Boolean(j.shipmentReady));
    setMeta(j.meta ?? null);
  }

  useEffect(() => {
    void load();
  }, [orderId]);

  if (marketplacePlatform) return null;

  async function run(action: "create" | "refresh" | "accept") {
    setBusy(true);
    setMsg(null);
    const method = action === "create" ? "POST" : action === "refresh" ? "PATCH" : "PUT";
    const res = await fetch(`/api/admin/orders/${orderId}/geliver`, { method });
    const j = (await res.json()) as { error?: string; meta?: GeliverOrderShipmentMeta };
    setBusy(false);
    if (!res.ok) {
      setMsg(j.error ?? "İşlem başarısız");
      return;
    }
    setMeta(j.meta ?? null);
    setMsg(action === "create" ? "Geliver gönderisi oluşturuldu" : "Güncellendi");
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50/50 p-6">
      <h2 className="font-semibold text-sky-950">Geliver Kargo</h2>
      {!ready ? (
        <p className="mt-2 text-sm text-amber-900">
          API token tanımlı değil.{" "}
          <a href="/admin/integrations/shipping" className="underline">
            Geliver Entegrasyonu →
          </a>
        </p>
      ) : !shipmentReady ? (
        <p className="mt-2 text-sm text-amber-900">
          Token kayıtlı; gönderi için gönderici adresi gerekli.{" "}
          <a href="/admin/integrations/shipping" className="underline">
            Geliver sayfasında «Gönderici adresi oluştur»
          </a>
        </p>
      ) : (
        <p className="mt-1 text-sm text-zinc-600">
          Tek tıkla gönderi oluşturun, etiket alın ve takip numarasını müşteriye iletin.
        </p>
      )}

      {meta ? (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Gönderi ID</dt>
            <dd className="font-mono text-xs">{meta.shipmentId}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Durum</dt>
            <dd>{meta.trackingStatusCode || meta.statusCode || "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Takip no</dt>
            <dd>{meta.trackingNumber || "—"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Barkod</dt>
            <dd>{meta.barcode || "—"}</dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={!shipmentReady || busy}
          onClick={() => void run("create")}
        >
          {meta?.labelURL ? "Yeniden oluştur" : "Geliver ile gönder"}
        </button>
        {meta?.shipmentId ? (
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => void run("refresh")}>
            Durumu yenile
          </button>
        ) : null}
        {meta?.shipmentId && !meta.labelURL ? (
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => void run("accept")}>
            Teklifi kabul et
          </button>
        ) : null}
        {meta?.labelURL ? (
          <a
            href={meta.labelURL}
            target="_blank"
            rel="noreferrer"
            className={btnSecondary}
          >
            Etiket PDF ↗
          </a>
        ) : null}
        {meta?.trackingUrl ? (
          <a
            href={meta.trackingUrl}
            target="_blank"
            rel="noreferrer"
            className={btnSecondary}
          >
            Takip linki ↗
          </a>
        ) : null}
      </div>

      {msg ? <p className="mt-3 text-sm text-zinc-700">{msg}</p> : null}
    </div>
  );
}
