"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildCarrierTrackingUrl } from "@/lib/admin/carrier-tracking";
import { shouldFocusInvoiceAfterSave } from "@/lib/admin/order-invoice-workflow";
import { ORDER_STATUSES } from "@/lib/admin/marketplace-platforms";
import { isCardOrderAwaitingPayment } from "@/lib/orders/card-payment-rules";
import { AdminField, btnPrimary, inputClass } from "@/components/admin/AdminForm";

type CarrierOpt = { id: string; name: string; trackingUrlTemplate: string | null };

export function OrderDetailForm({
  orderId,
  initialStatus,
  initialCarrierId,
  initialTracking,
  initialNotes,
  paymentMethod,
  paymentStatus,
  carriers,
  invoiceComplete,
}: {
  orderId: string;
  initialStatus: string;
  initialCarrierId: string;
  initialTracking: string;
  initialNotes: string;
  paymentMethod: string | null;
  paymentStatus: string;
  carriers: CarrierOpt[];
  invoiceComplete: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [carrierId, setCarrierId] = useState(initialCarrierId);
  const [trackingNumber, setTrackingNumber] = useState(initialTracking);
  const [adminNotes, setAdminNotes] = useState(initialNotes);
  const [msg, setMsg] = useState<string | null>(null);

  const trackingPreviewUrl = useMemo(() => {
    const carrier = carriers.find((c) => c.id === carrierId);
    return buildCarrierTrackingUrl(carrier?.trackingUrlTemplate, trackingNumber);
  }, [carriers, carrierId, trackingNumber]);

  const awaitingCardPayment = isCardOrderAwaitingPayment({ paymentMethod, paymentStatus });

  async function save() {
    const previousStatus = initialStatus;
    const previousTracking = initialTracking;
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, carrierId: carrierId || null, trackingNumber, adminNotes }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg(j.error ?? "Hata");
      return;
    }
    setMsg("Kaydedildi");
    const focus = shouldFocusInvoiceAfterSave({
      status,
      trackingNumber,
      previousStatus,
      previousTracking,
      invoiceComplete,
    });
    if (focus) {
      router.push(`/admin/orders/${orderId}?focus=invoice`);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="max-w-xl space-y-4 rounded-xl border bg-white p-6">
      <h2 className="font-semibold">Sipariş yönetimi</h2>
      {awaitingCardPayment ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          role="alert"
        >
          <strong>Ödeme alınmadı.</strong> Bu kartlı sipariş henüz tahsil edilmedi — ürün hazırlamayın
          veya kargolamayın. Müşteri ödemeyi tamamlayana kadar bekleyin veya siparişi iptal edin.
        </div>
      ) : null}
      <AdminField label="Durum">
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          {ORDER_STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </AdminField>
      <AdminField label="Kargo firması">
        <select className={inputClass} value={carrierId} onChange={(e) => setCarrierId(e.target.value)}>
          <option value="">— Seçin —</option>
          {carriers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </AdminField>
      <AdminField label="Takip numarası">
        <input
          className={inputClass}
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
        />
        {trackingPreviewUrl ? (
          <p className="mt-1 text-xs text-zinc-600">
            Önizleme:{" "}
            <Link
              href={trackingPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--kn-brand)] underline"
            >
              Kargo takip linki
            </Link>
          </p>
        ) : trackingNumber.trim() && carrierId ? (
          <p className="mt-1 text-xs text-amber-800">
            Bu kargo firmasında takip URL şablonu tanımlı değil.{" "}
            <Link href={`/admin/shipping/${carrierId}`} className="underline">
              Firmayı düzenle
            </Link>
          </p>
        ) : null}
      </AdminField>
      <AdminField label="Admin notu">
        <textarea
          className={inputClass}
          rows={3}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
        />
      </AdminField>
      {status === "shipped" && !invoiceComplete ? (
        <p className="text-sm text-amber-900">
          Kaydettikten sonra <strong>e-Arşiv fatura</strong> paneline yönlendirilirsiniz (takip no dolu olmalı).
        </p>
      ) : null}
      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
      <button type="button" className={btnPrimary} onClick={() => void save()}>
        Kaydet
      </button>
    </div>
  );
}
