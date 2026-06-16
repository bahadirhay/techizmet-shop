"use client";

import Link from "next/link";
import { AdminField, inputClass } from "@/components/admin/AdminForm";
import { formatTry, minorToTry, tryToMinor } from "@/lib/admin/money";
import type { ActiveMarketplaceOption } from "@/lib/marketplace/product-prices";
import { buildPlatformListingTitle } from "@/lib/marketplace/title-rules";
import {
  DEFAULT_WEB_MARKUP_PERCENT,
  inferMarkupPercentFromPrices,
  MARKETPLACE_MARKUP_PRESETS,
  normalizeMarkupPercent,
  webMarkupPriceMinor,
} from "@/lib/marketplace/pricing-calculator";

function markupPriceLabel(webPrice: string, markupPercent: number): string | null {
  const webMinor = tryToMinor(webPrice);
  if (webMinor <= 0) return null;
  const minor = webMarkupPriceMinor(webMinor, markupPercent);
  return minor != null ? minorToTry(minor) : null;
}

export function ProductMarketplacePrices({
  webPrice,
  categoryId: _categoryId,
  platforms,
  prices,
  markups,
  onChange,
  onMarkupChange,
  title = "",
  brandName = "",
  weightGrams,
  pieceCount,
}: {
  webPrice: string;
  cost?: string;
  categoryId: string;
  platforms: ActiveMarketplaceOption[];
  prices: Record<string, string>;
  markups: Record<string, string>;
  onChange: (platform: string, value: string) => void;
  onMarkupChange: (platform: string, value: string) => void;
  title?: string;
  brandName?: string;
  weightGrams?: number;
  pieceCount?: number;
}) {
  const webMinor = tryToMinor(webPrice);

  function applyMarkup(platform: string, markupPercent: number) {
    onMarkupChange(platform, String(markupPercent));
    const nextPrice = markupPriceLabel(webPrice, markupPercent);
    if (nextPrice) onChange(platform, nextPrice);
  }

  function handlePriceChange(platform: string, value: string) {
    onChange(platform, value);
    const channelMinor = tryToMinor(value);
    if (webMinor > 0 && channelMinor > 0) {
      const inferred = inferMarkupPercentFromPrices(webMinor, channelMinor);
      if (inferred != null) onMarkupChange(platform, String(inferred));
    } else if (!value.trim()) {
      onMarkupChange(platform, "");
    }
  }

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

  const titlePreviews = title.trim()
    ? platforms.map((p) => ({
        id: p.id,
        label: p.label,
        computed: buildPlatformListingTitle(p.id, title, brandName || undefined, {
          weightGrams,
          pieceCount,
        }),
      }))
    : [];

  const defaultSuggested =
    webMinor > 0 ? markupPriceLabel(webPrice, DEFAULT_WEB_MARKUP_PERCENT) : null;

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-violet-950">Pazaryeri satış fiyatları</p>
        <p className="mt-1 text-xs text-violet-900">
          Fiyatlar <strong>web satış fiyatı</strong> üzerinden hesaplanır (
          {webPrice ? `${webPrice} ₺` : "—"}). Yüzde fark girin veya hızlı +%10 / +%15 düğmelerini
          kullanın. Boş bırakırsanız web fiyatı senkrona gider.
        </p>
      </div>

      {titlePreviews.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-violet-900">
            Gönderilecek başlıklar{" "}
            <span className="font-normal text-violet-700">(eşleştirmede bu başlık gider)</span>
          </p>
          {titlePreviews.map((p) => (
            <div key={p.id} className="flex items-start gap-2 rounded bg-white/70 px-2 py-1.5 text-xs">
              <span className="shrink-0 font-medium text-zinc-700 w-24">{p.label}</span>
              <span className="text-zinc-800 break-all">{p.computed}</span>
              <span className="shrink-0 text-zinc-400 ml-auto">{p.computed.length} kar.</span>
            </div>
          ))}
        </div>
      ) : null}

      {platforms.map((p) => {
        const val = prices[p.id] ?? "";
        const markupRaw = markups[p.id] ?? "";
        const markupPct = normalizeMarkupPercent(markupRaw);
        const computedFromMarkup =
          markupPct != null && webMinor > 0 ? markupPriceLabel(webPrice, markupPct) : null;
        const channelMinor = val ? tryToMinor(val) : NaN;
        const diff =
          webMinor > 0 && Number.isFinite(channelMinor) && channelMinor > 0
            ? channelMinor - webMinor
            : null;

        return (
          <div key={p.id} className="rounded-lg border border-violet-100 bg-white/60 p-3 space-y-2">
            <p className="text-sm font-medium text-violet-950">{p.label}</p>

            <AdminField
              label="Web üzerinden % fark"
              hint={
                markupPct != null
                  ? computedFromMarkup
                    ? `Hesaplanan: ${computedFromMarkup} ₺ (web ${markupPct >= 0 ? "+" : ""}${markupPct}%)`
                    : "Web fiyatı girin"
                  : `Varsayılan öneri: +%${DEFAULT_WEB_MARKUP_PERCENT}`
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className={`${inputClass} max-w-[7rem]`}
                  type="number"
                  step="0.1"
                  value={markupRaw}
                  placeholder={String(DEFAULT_WEB_MARKUP_PERCENT)}
                  onChange={(e) => {
                    const next = e.target.value;
                    onMarkupChange(p.id, next);
                    const pct = normalizeMarkupPercent(next);
                    if (pct != null && webMinor > 0) {
                      const price = markupPriceLabel(webPrice, pct);
                      if (price) onChange(p.id, price);
                    }
                  }}
                />
                <span className="text-xs text-zinc-500">%</span>
                {MARKETPLACE_MARKUP_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs text-violet-900 hover:bg-violet-50"
                    onClick={() => applyMarkup(p.id, preset)}
                  >
                    +{preset}%
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                  onClick={() => applyMarkup(p.id, 0)}
                >
                  Web ile aynı
                </button>
                <button
                  type="button"
                  className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                  onClick={() => applyMarkup(p.id, -5)}
                >
                  −5%
                </button>
                {defaultSuggested && !val ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--kn-brand)] underline"
                    onClick={() => applyMarkup(p.id, DEFAULT_WEB_MARKUP_PERCENT)}
                  >
                    +{DEFAULT_WEB_MARKUP_PERCENT}% uygula ({defaultSuggested} ₺)
                  </button>
                ) : null}
              </div>
            </AdminField>

            <AdminField
              label="Satış fiyatı (TL)"
              hint={
                !val
                  ? computedFromMarkup
                    ? `Markup ile: ${computedFromMarkup} ₺`
                    : "Web fiyatı kullanılacak"
                  : diff != null && diff !== 0
                    ? `Web'den ${diff > 0 ? "+" : ""}${formatTry(diff)} (${markupPct != null ? `%${markupPct}` : "elle"})`
                    : "Web ile aynı"
              }
            >
              <input
                className={`${inputClass} max-w-xs`}
                type="number"
                step="0.01"
                min={0}
                value={val}
                placeholder={computedFromMarkup || webPrice || "Web fiyatı"}
                onChange={(e) => handlePriceChange(p.id, e.target.value)}
              />
            </AdminField>
          </div>
        );
      })}

      {webMinor <= 0 ? (
        <p className="text-xs text-amber-900">Önce web satış fiyatını girin — pazaryeri hesabı buna bağlıdır.</p>
      ) : null}
    </div>
  );
}
