"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatTry } from "@/lib/admin/money";
import type { ActiveMarketplaceOption } from "@/lib/marketplace/product-prices";
import {
  buildChannelEconomicsRow,
  DEFAULT_WEB_MARKUP_PERCENT,
  type ChannelEconomicsRow,
} from "@/lib/marketplace/pricing-calculator";
import type { ResolvedCommissionRule } from "@/lib/marketplace/commission-types";
import { normalizeMarkupPercent } from "@/lib/marketplace/pricing-calculator";
import { shippingModelLabel } from "@/lib/marketplace/commission-types";
import { TrendyolFlashProfitSimulator } from "@/components/admin/TrendyolFlashProfitSimulator";

function parseTryInput(v: string): number {
  const n = parseFloat(v.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

function marginClass(pct: number | null): string {
  if (pct == null) return "text-zinc-500";
  if (pct >= 20) return "text-emerald-700";
  if (pct >= 0) return "text-amber-800";
  return "text-red-600";
}

function ChannelRow({ row }: { row: ChannelEconomicsRow }) {
  return (
    <tr className="border-b border-violet-100">
      <td className="py-2 pr-3 font-medium text-zinc-800 whitespace-nowrap">{row.platformLabel}</td>
      <td className="py-2 pr-3 text-right tabular-nums">
        <span className="font-medium">{formatTry(row.grossMinor)}</span>
        {row.usesWebFallback ? (
          <span className="mt-0.5 block text-[10px] text-zinc-500">web fiyatı</span>
        ) : row.usesWebMarkup && row.markupPercent != null ? (
          <span className="mt-0.5 block text-[10px] text-violet-600">
            web {row.markupPercent >= 0 ? "+" : ""}
            {row.markupPercent}%
          </span>
        ) : null}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums text-amber-900">
        −{formatTry(row.commissionMinor)}
        <span className="block text-[10px] text-zinc-500">
          %{row.commissionPercent}
          {row.extraCommissionPercent > 0 ? ` + %${row.extraCommissionPercent} ek` : ""}
        </span>
      </td>
      <td className="py-2 pr-3 text-right tabular-nums text-amber-900">
        {row.shippingDeductionMinor > 0 ? (
          <>
            −{formatTry(row.shippingDeductionMinor)}
            <span className="block text-[10px] text-zinc-500">{shippingModelLabel(row.shippingModel)}</span>
          </>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums font-semibold text-violet-950">
        {formatTry(row.netPayoutMinor)}
      </td>
      <td className={`py-2 pr-3 text-right tabular-nums ${marginClass(row.marginOnCostPercent)}`}>
        {row.marginOnCostPercent != null ? `%${row.marginOnCostPercent}` : "—"}
      </td>
      <td className="py-2 text-right tabular-nums text-zinc-600">
        {row.webDiffMinor != null && row.webDiffMinor !== 0 ? (
          <span className={row.webDiffMinor > 0 ? "text-violet-800" : "text-amber-800"}>
            {row.webDiffMinor > 0 ? "+" : ""}
            {formatTry(row.webDiffMinor)}
          </span>
        ) : (
          <span className="text-zinc-400">0</span>
        )}
      </td>
    </tr>
  );
}

function resolveTrendyolListPriceTry(
  webPrice: string,
  marketplacePrices: Record<string, string>,
  marketplaceMarkups: Record<string, string>,
): string {
  const override = marketplacePrices.trendyol?.trim();
  if (override) return override;
  const webMinor = parseTryInput(webPrice);
  if (webMinor <= 0) return "";
  const markup = normalizeMarkupPercent(marketplaceMarkups.trendyol);
  if (markup != null) {
    return (Math.round(webMinor * (1 + markup / 100)) / 100).toFixed(2);
  }
  return (webMinor / 100).toFixed(2);
}

export function ProductPricingBreakdown({
  webPrice,
  cost,
  wholesale,
  categoryId,
  platforms,
  marketplacePrices,
  marketplaceMarkups,
  productId,
  barcode,
}: {
  webPrice: string;
  cost: string;
  wholesale: string;
  categoryId: string;
  platforms: ActiveMarketplaceOption[];
  marketplacePrices: Record<string, string>;
  marketplaceMarkups: Record<string, string>;
  productId?: string;
  barcode?: string;
}) {
  const [rules, setRules] = useState<Record<string, ResolvedCommissionRule>>({});
  const [rulesBusy, setRulesBusy] = useState(false);
  const [fixedFeeMinor, setFixedFeeMinor] = useState(0);
  const [packagingCostMinor, setPackagingCostMinor] = useState(0);

  useEffect(() => {
    if (!platforms.length) {
      setRules({});
      return;
    }
    let cancelled = false;
    setRulesBusy(true);
    const q = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : "";
    void (async () => {
      try {
        const res = await fetch(`/api/admin/marketplace/resolve-rules${q}`);
        const j = (await res.json()) as {
          rules?: Record<string, ResolvedCommissionRule>;
          finance?: { trendyolFixedFeeMinor?: number; packagingCostMinor?: number };
        };
        if (!cancelled) {
          setRules(j.rules ?? {});
          setFixedFeeMinor(Math.max(0, j.finance?.trendyolFixedFeeMinor ?? 0));
          setPackagingCostMinor(Math.max(0, j.finance?.packagingCostMinor ?? 0));
        }
      } catch {
        if (!cancelled) setRules({});
      } finally {
        if (!cancelled) setRulesBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryId, platforms]);

  const webMinor = parseTryInput(webPrice);
  const costMinor = parseTryInput(cost) || null;
  const wholesaleMinor = parseTryInput(wholesale) || null;
  const hasTrendyol = platforms.some((p) => p.id === "trendyol");
  const trendyolListPriceTry = resolveTrendyolListPriceTry(
    webPrice,
    marketplacePrices,
    marketplaceMarkups,
  );

  const rows = useMemo(() => {
    if (!platforms.length || webMinor <= 0) return [];
    return platforms
      .map((p) => {
        const rule = rules[p.id];
        if (!rule) return null;
        const overrideRaw = marketplacePrices[p.id]?.trim();
        const overrideMinor = overrideRaw ? parseTryInput(overrideRaw) : null;
        const markupPercent = normalizeMarkupPercent(marketplaceMarkups[p.id]);
        return buildChannelEconomicsRow({
          platform: p.id,
          platformLabel: p.label,
          webPriceMinor: webMinor,
          marketplaceOverrideMinor: overrideMinor,
          markupPercent,
          costMinor,
          wholesaleMinor,
          rule,
        });
      })
      .filter((r): r is ChannelEconomicsRow => r != null);
  }, [platforms, webMinor, costMinor, wholesaleMinor, marketplacePrices, marketplaceMarkups, rules]);

  if (!platforms.length) return null;
  if (webMinor <= 0 && !hasTrendyol) return null;

  const wholesaleMargin =
    wholesaleMinor != null && costMinor != null && costMinor > 0
      ? Math.round(((wholesaleMinor - costMinor) / costMinor) * 1000) / 10
      : null;

  return (
    <div className="space-y-4">
      {webMinor > 0 ? (
        <div className="rounded-lg border border-violet-300 bg-violet-50/40 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-violet-950">Fiyat özeti ve pazaryeri hakedişi</p>
            <p className="mt-1 text-xs text-violet-900">
              Komisyon ve kargo kuralları pazaryeri entegrasyonundan alınır. Satış fiyatındaki +%
              {DEFAULT_WEB_MARKUP_PERCENT}, web fiyatına göre pazaryeri artışıdır (komisyon değil).{" "}
              <Link href="/admin/integrations" className="underline">
                Komisyon kuralları
              </Link>
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 text-sm">
            <div className="rounded-md bg-white/80 px-3 py-2">
              <p className="text-xs text-zinc-500">Web satış</p>
              <p className="font-semibold tabular-nums">{formatTry(webMinor)}</p>
            </div>
            <div className="rounded-md bg-white/80 px-3 py-2">
              <p className="text-xs text-zinc-500">Toptan</p>
              <p className="font-semibold tabular-nums">
                {wholesaleMinor ? formatTry(wholesaleMinor) : "—"}
              </p>
              {wholesaleMargin != null ? (
                <p className={`text-xs ${marginClass(wholesaleMargin)}`}>
                  Maliyet üzerinden %{wholesaleMargin}
                </p>
              ) : null}
            </div>
            <div className="rounded-md bg-white/80 px-3 py-2">
              <p className="text-xs text-zinc-500">Maliyet</p>
              <p className="font-semibold tabular-nums">{costMinor ? formatTry(costMinor) : "—"}</p>
            </div>
          </div>

          {rulesBusy && !rows.length ? (
            <p className="text-xs text-zinc-500">Komisyon kuralları yükleniyor…</p>
          ) : rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-violet-200 text-left text-xs text-zinc-500">
                    <th className="pb-2 pr-3">Kanal</th>
                    <th className="pb-2 pr-3 text-right">Satış fiyatı</th>
                    <th className="pb-2 pr-3 text-right">Komisyon</th>
                    <th className="pb-2 pr-3 text-right">Kargo</th>
                    <th className="pb-2 pr-3 text-right">Net hakediş</th>
                    <th className="pb-2 pr-3 text-right">Marj (maliyet)</th>
                    <th className="pb-2 text-right">Web farkı</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <ChannelRow key={row.platform} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-amber-800">
              Komisyon kuralı bulunamadı — varsayılan %15 uygulanır.
            </p>
          )}

          {rows.some((r) => r.suggestedMinor != null) ? (
            <div className="space-y-1 border-t border-violet-200 pt-2 text-xs text-violet-900">
              <p className="font-medium">
                Önerilen pazaryeri fiyatları (web + %{DEFAULT_WEB_MARKUP_PERCENT})
              </p>
              {rows.map((r) =>
                r.suggestedMinor != null ? (
                  <p key={r.platform}>
                    {r.platformLabel}: <strong>{formatTry(r.suggestedMinor)}</strong>
                    {r.grossMinor !== r.suggestedMinor ? (
                      <span className="text-zinc-600">
                        {" "}
                        (şu an {formatTry(r.grossMinor)}
                        {r.grossMinor < r.suggestedMinor ? ", düşük" : ", yüksek"})
                      </span>
                    ) : (
                      <span className="text-emerald-700"> — uygun</span>
                    )}
                  </p>
                ) : null,
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {hasTrendyol ? (
        <TrendyolFlashProfitSimulator
          listPriceTry={trendyolListPriceTry}
          costTry={cost}
          rule={rules.trendyol ?? null}
          fixedFeeMinor={fixedFeeMinor}
          packagingCostMinor={packagingCostMinor}
          productId={productId}
          barcode={barcode}
          categoryId={categoryId}
        />
      ) : null}
    </div>
  );
}
