"use client";

import Link from "next/link";
import { useState } from "react";
import { carrierProviderLabel, type ShippingProvider } from "@/lib/shipping/carrier-config";

export type ShippingCarrierRow = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  provider: ShippingProvider;
  rateCount: number;
};

export function ShippingCarriersList({ carriers: initial }: { carriers: ShippingCarrierRow[] }) {
  const [carriers, setCarriers] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleActive(carrier: ShippingCarrierRow) {
    setBusyId(carrier.id);
    const res = await fetch(`/api/admin/shipping/carriers/${carrier.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !carrier.active }),
    });
    setBusyId(null);
    if (!res.ok) return;
    setCarriers((list) =>
      list.map((c) => (c.id === carrier.id ? { ...c, active: !c.active } : c)),
    );
  }

  return (
    <ul className="mt-6 divide-y rounded-xl border bg-white">
      {carriers.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium">
              {c.name}{" "}
              <span className="text-xs font-normal text-zinc-500">({c.code})</span>
            </p>
            <p className="text-sm text-zinc-500">
              {c.rateCount} tarife · {carrierProviderLabel(c.provider)} ·{" "}
              <span className={c.active ? "text-emerald-700" : "text-zinc-400"}>
                {c.active ? "Aktif" : "Pasif"}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={c.active}
                disabled={busyId === c.id}
                onChange={() => void toggleActive(c)}
              />
              Ödeme sayfasında göster
            </label>
            <Link href={`/admin/shipping/${c.id}`} className="text-sm text-[var(--kn-brand)]">
              Düzenle
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
