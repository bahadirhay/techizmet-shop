"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminField, inputClass } from "@/components/admin/AdminForm";
import { formatTry, minorToTry } from "@/lib/admin/money";
import type { ActiveMarketplaceOption } from "@/lib/marketplace/product-prices";
import { DEFAULT_TARGET_MARGIN_PERCENT } from "@/lib/marketplace/commission-types";

export function ProductMarketplacePrices({
  webPrice,
  cost,
  categoryId,
  platforms,
  prices,
  onChange,
}: {
  webPrice: string;
  cost: string;
  categoryId: string;
  platforms: ActiveMarketplaceOption[];
  prices: Record<string, string>;
  onChange: (platform: string, value: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!cost.trim() || platforms.length === 0) {
      setSuggestions({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const next: Record<string, string> = {};
      for (const p of platforms) {
        const q = new URLSearchParams({
          platform: p.id,
          cost,
          targetMargin: String(DEFAULT_TARGET_MARGIN_PERCENT),
        });
        if (categoryId) q.set("categoryId", categoryId);
        const res = await fetch(`/api/admin/marketplace/price-suggest?${q}`);
        const j = (await res.json()) as { suggestedMinor?: number | null };
        if (j.suggestedMinor != null && j.suggestedMinor > 0) {
          next[p.id] = minorToTry(j.suggestedMinor);
        }
      }
      if (!cancelled) setSuggestions(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [cost, categoryId, platforms]);

  if (platforms.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4">
        <p className="text-sm font-medium text-zinc-800">Pazaryeri fiyatları</p>
        <p className="mt-1 text-xs text-zinc-600">
          Aktif pazaryeri entegrasyonu yok.{" "}
          <Link href="/admin/integrations" className="text-[var(--kn-brand)] underline">
            Pazaryerleri
          </Link>{" "}
          bölümünden bağlayın.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-violet-950">Pazaryeri satış fiyatları</p>
        <p className="mt-1 text-xs text-violet-900">
          Boş bırakırsanız web fiyatı ({webPrice ? `${webPrice} ₺` : "—"}) kullanılır. Maliyet +
          komisyon tablosu varsa önerilen fiyat gösterilir (%{DEFAULT_TARGET_MARGIN_PERCENT} hedef marj).
        </p>
      </div>

      {platforms.map((p) => {
        const val = prices[p.id] ?? "";
        const suggested = suggestions[p.id];
        const channelMinor = val ? parseFloat(val.replace(",", ".")) * 100 : NaN;
        const webMinor = parseFloat(webPrice.replace(",", ".")) * 100;
        const diff =
          Number.isFinite(webMinor) && webMinor > 0 && Number.isFinite(channelMinor) && channelMinor > 0
            ? Math.round(channelMinor - webMinor)
            : null;

        return (
          <AdminField
            key={p.id}
            label={`${p.label} satış fiyatı (TL)`}
            hint={
              !val
                ? suggested
                  ? `Önerilen: ${suggested} ₺ (maliyet + komisyon)`
                  : "Web fiyatı kullanılacak"
                : diff != null && diff !== 0
                  ? `Web'den ${diff > 0 ? "+" : ""}${formatTry(diff)} farklı`
                  : "Web ile aynı"
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={`${inputClass} max-w-xs`}
                type="number"
                step="0.01"
                min={0}
                value={val}
                placeholder={suggested || webPrice || "Web fiyatı"}
                onChange={(e) => onChange(p.id, e.target.value)}
              />
              {suggested && !val ? (
                <button
                  type="button"
                  className="text-xs text-[var(--kn-brand)] underline"
                  onClick={() => onChange(p.id, suggested)}
                >
                  Önerilen: {suggested} ₺ uygula
                </button>
              ) : null}
            </div>
          </AdminField>
        );
      })}

      {!cost.trim() ? (
        <p className="text-xs text-amber-900">
          Maliyet girilmedi — fiyat önerisi hesaplanmaz; satış ve senkron normal çalışır.
        </p>
      ) : null}
    </div>
  );
}
