"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/admin/AdminForm";
import { ORDER_STATUSES } from "@/lib/admin/marketplace-platforms";
import { orderSourceLabel, orderSourceBadgeClass } from "@/lib/marketplace/order-source";

type OrderRow = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  status: string;
  marketplacePlatform: string | null;
  createdAt: string;
  trackingNumber: string | null;
  carrierName: string | null;
};

function statusLabel(id: string) {
  return ORDER_STATUSES.find((s) => s.id === id)?.label ?? id;
}

export function ShippingLabelsPicker({
  orders,
  initialStatus,
}: {
  orders: OrderRow[];
  initialStatus: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState(initialStatus);

  const visible = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "active") {
      return orders.filter((o) => ["pending", "confirmed", "preparing"].includes(o.status));
    }
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const allVisibleSelected = visible.length > 0 && visible.every((o) => selected.has(o.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const o of visible) next.delete(o.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const o of visible) next.add(o.id);
        return next;
      });
    }
  }

  const printHref =
    selected.size > 0
      ? `/admin/orders/labels/print?ids=${[...selected].join(",")}`
      : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { id: "active", label: "Hazırlanan" },
          { id: "pending", label: "Bekleyen" },
          { id: "preparing", label: "Hazırlanıyor" },
          { id: "shipped", label: "Kargoda" },
          { id: "all", label: "Tümü" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              filter === f.id
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 no-print">
        {printHref ? (
          <Link href={printHref} className={btnPrimary}>
            {selected.size} etiket yazdır
          </Link>
        ) : (
          <button type="button" className={btnPrimary} disabled>
            Etiket yazdır
          </button>
        )}
        <button type="button" className={btnSecondary} onClick={toggleAll}>
          {allVisibleSelected ? "Seçimi kaldır" : "Görünenleri seç"}
        </button>
        <span className="text-sm text-zinc-500">{selected.size} seçili</span>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-zinc-500">Bu filtrede sipariş yok.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    aria-label="Tümünü seç"
                  />
                </th>
                <th>Kaynak</th>
                <th>Sipariş</th>
                <th>Alıcı</th>
                <th>Durum</th>
                <th>Kargo</th>
                <th>Tarih</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <tr key={o.id} className={selected.has(o.id) ? "bg-emerald-50/60" : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggle(o.id)}
                      aria-label={`${o.orderNumber} seç`}
                    />
                  </td>
                  <td>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${orderSourceBadgeClass(o.marketplacePlatform)}`}
                    >
                      {orderSourceLabel(o)}
                    </span>
                  </td>
                  <td className="font-medium">{o.orderNumber}</td>
                  <td>{o.customerName ?? "—"}</td>
                  <td>{statusLabel(o.status)}</td>
                  <td>
                    {o.carrierName ?? "—"}
                    {o.trackingNumber ? (
                      <span className="block text-xs text-zinc-500">{o.trackingNumber}</span>
                    ) : null}
                  </td>
                  <td className="text-zinc-500">
                    {new Date(o.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td>
                    <Link href={`/admin/orders/labels/print?ids=${o.id}`} className="text-[var(--kn-brand)]">
                      Etiket
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
