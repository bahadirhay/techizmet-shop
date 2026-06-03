"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminField, btnPrimary, btnSecondary, inputClass } from "@/components/admin/AdminForm";
import { ShippingLabelSheet } from "@/components/admin/ShippingLabelSheet";
import {
  mergeShipFromAddress,
  type ShipFromAddress,
  type ShippingLabelData,
} from "@/lib/admin/shipping-label";

const STORAGE_KEY = "admin-ship-from";

function loadStoredShipFrom(siteId: string, initial: ShipFromAddress): ShipFromAddress {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${siteId}`);
    if (!raw) return initial;
    return mergeShipFromAddress(initial, JSON.parse(raw) as Partial<ShipFromAddress>);
  } catch {
    return initial;
  }
}

export function ShippingLabelsPrintClient({
  siteId,
  labels,
  initialShipFrom,
}: {
  siteId: string;
  labels: ShippingLabelData[];
  initialShipFrom: ShipFromAddress;
}) {
  const [shipFrom, setShipFrom] = useState(initialShipFrom);
  const [labelSize, setLabelSize] = useState<"standard" | "compact">("standard");
  const [showSenderForm, setShowSenderForm] = useState(false);

  useEffect(() => {
    setShipFrom(loadStoredShipFrom(siteId, initialShipFrom));
  }, [siteId, initialShipFrom]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}:${siteId}`, JSON.stringify(shipFrom));
  }, [siteId, shipFrom]);

  const idsParam = useMemo(() => labels.map((l) => l.orderId).join(","), [labels]);

  if (!labels.length) {
    return (
      <div className="admin-card admin-card-pad">
        <p className="text-sm text-zinc-600">Etiket basılacak sipariş bulunamadı.</p>
        <Link href="/admin/orders/labels" className={`${btnSecondary} mt-4 inline-block`}>
          ← Etiket listesine dön
        </Link>
      </div>
    );
  }

  return (
    <div className="shipping-labels-print">
      <div className="shipping-labels-print__toolbar admin-card admin-card-pad no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{labels.length} etiket</h2>
            <p className="text-sm text-zinc-500">100×150 mm termal veya A4 yazıcıya uygun</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/orders/labels" className={btnSecondary}>
              ← Listeye dön
            </Link>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setShowSenderForm((v) => !v)}
            >
              Gönderici adresi
            </button>
            <select
              className={`${inputClass} w-auto`}
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value as "standard" | "compact")}
            >
              <option value="standard">100 × 150 mm</option>
              <option value="compact">100 × 100 mm</option>
            </select>
            <button type="button" className={btnPrimary} onClick={() => window.print()}>
              Yazdır
            </button>
          </div>
        </div>

        {showSenderForm ? (
          <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <AdminField label="Firma / mağaza adı">
              <input
                className={inputClass}
                value={shipFrom.name}
                onChange={(e) => setShipFrom({ ...shipFrom, name: e.target.value })}
              />
            </AdminField>
            <AdminField label="Adres satırı 1">
              <input
                className={inputClass}
                value={shipFrom.line1}
                onChange={(e) => setShipFrom({ ...shipFrom, line1: e.target.value })}
              />
            </AdminField>
            <AdminField label="Adres satırı 2">
              <input
                className={inputClass}
                value={shipFrom.line2 ?? ""}
                onChange={(e) => setShipFrom({ ...shipFrom, line2: e.target.value })}
              />
            </AdminField>
            <AdminField label="İlçe">
              <input
                className={inputClass}
                value={shipFrom.district}
                onChange={(e) => setShipFrom({ ...shipFrom, district: e.target.value })}
              />
            </AdminField>
            <AdminField label="İl">
              <input
                className={inputClass}
                value={shipFrom.city}
                onChange={(e) => setShipFrom({ ...shipFrom, city: e.target.value })}
              />
            </AdminField>
            <AdminField label="Posta kodu">
              <input
                className={inputClass}
                value={shipFrom.postalCode}
                onChange={(e) => setShipFrom({ ...shipFrom, postalCode: e.target.value })}
              />
            </AdminField>
            <AdminField label="Telefon">
              <input
                className={inputClass}
                value={shipFrom.phone}
                onChange={(e) => setShipFrom({ ...shipFrom, phone: e.target.value })}
              />
            </AdminField>
          </div>
        ) : null}

        <p className="mt-3 text-xs text-zinc-500">
          Gönderici bilgisi tarayıcıda saklanır. Kalıcı ayar için mağaza ayarlarına eklenebilir.
          {idsParam ? ` · ID: ${idsParam.slice(0, 40)}${idsParam.length > 40 ? "…" : ""}` : null}
        </p>
      </div>

      <div className={`shipping-labels-print__stack shipping-labels-print__stack--${labelSize}`}>
        {labels.map((label) => (
          <ShippingLabelSheet key={label.orderId} label={label} shipFrom={shipFrom} size={labelSize} />
        ))}
      </div>
    </div>
  );
}
