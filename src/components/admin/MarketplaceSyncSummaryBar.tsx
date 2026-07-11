"use client";

import type { MarketplaceSyncTotals } from "@/lib/marketplace/listing-sync-state";

type SyncFilter = "all" | "stale" | "not_listed" | "needs_attention";

export function MarketplaceSyncSummaryBar({
  totals,
  filter,
  onFilterChange,
  hasActivePlatforms,
}: {
  totals: MarketplaceSyncTotals;
  filter: SyncFilter;
  onFilterChange: (f: SyncFilter) => void;
  hasActivePlatforms: boolean;
}) {
  if (!hasActivePlatforms) {
    return (
      <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        Aktif pazaryeri entegrasyonu yok.{" "}
        <a href="/admin/integrations" className="font-medium text-zinc-900 underline">
          Entegrasyonlar
        </a>{" "}
        sayfasından Trendyol, Amazon vb. bağlayın; ardından burada senkron durumunu görebilirsiniz.
      </div>
    );
  }

  const chips: { id: SyncFilter; label: string; count: number; className: string }[] = [
    { id: "all", label: "Tümü", count: totals.products, className: "border-zinc-300 bg-white text-zinc-800" },
    {
      id: "stale",
      label: "Güncelleme bekliyor",
      count: totals.stale,
      className: "border-amber-300 bg-amber-50 text-amber-900",
    },
    {
      id: "not_listed",
      label: "Pazaryerinde yok",
      count: totals.notListed,
      className: "border-zinc-300 bg-zinc-100 text-zinc-700",
    },
    {
      id: "needs_attention",
      label: "Hata / dikkat",
      count: totals.needsAttention,
      className: "border-red-300 bg-red-50 text-red-800",
    },
  ];

  return (
    <div className="mb-4 space-y-2 rounded-xl border bg-white p-3">
      <p className="text-sm text-zinc-700">
        Mağazada düzenlediğiniz ürünler ile pazaryerindeki son içerik gönderimini karşılaştırır.
        Stok/fiyat otomatik senkronu bu uyarıyı sıfırlamaz — görsel, açıklama veya başlık
        değiştirdiyseniz ilgili platformda «gönder / güncelle» yapın.
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onFilterChange(chip.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === chip.id ? "ring-2 ring-zinc-400 ring-offset-1" : "hover:opacity-90"
            } ${chip.className}`}
          >
            {chip.label} ({chip.count})
          </button>
        ))}
        {totals.synced > 0 ? (
          <span className="self-center text-xs text-green-700">
            {totals.synced} ürün tüm platformlarda güncel
          </span>
        ) : null}
      </div>
    </div>
  );
}

export type { SyncFilter };
