import "server-only";

import { unstable_cache } from "next/cache";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
  storeSettingsTag,
} from "@/lib/cache/store-cache";
import { LEGACY_GELIVER_CARRIER_CODE } from "@/lib/shipping/geliver/provider-labels";
import { geliverReady } from "@/lib/shipping/geliver/settings";
import type { SiteSettings } from "@/lib/site-settings";

export type StoreShippingSummary = {
  /** Sepet toplamı bu tutarı geçince kargo ücretsiz (mağaza ayarı) */
  storeFreeOverMinor: number | null;
  /** Ödeme adımında sunulan aktif tarifeler (1 desi için) */
  rates: { priceMinor: number; freeOverMinor: number | null }[];
};

/**
 * Yapısal veri (Offer.shippingDetails) için kargo özeti.
 * Ödeme adımındaki `getShippingOptions` ile aynı kurallar; canlı teklif çağrısı yapılmaz.
 */
export function loadStoreShippingSummary(
  siteId: string,
  databaseUrl: string,
  settings: SiteSettings,
): Promise<StoreShippingSummary> {
  const geliverEnabled = geliverReady(settings);
  const storeFreeOverMinor = settings.store?.freeShippingOverMinor ?? null;
  return unstable_cache(
    async (): Promise<StoreShippingSummary> => {
      const { getPrismaForDatabaseUrl } = await import("@/lib/prisma");
      const carriers = await getPrismaForDatabaseUrl(databaseUrl).shippingCarrier.findMany({
        where: { siteId, active: true },
        select: {
          code: true,
          rates: {
            where: { active: true },
            select: { priceMinor: true, freeOverMinor: true, minDesi: true, maxDesi: true },
          },
        },
      });
      const rates: StoreShippingSummary["rates"] = [];
      for (const carrier of carriers) {
        if (geliverEnabled && carrier.code === LEGACY_GELIVER_CARRIER_CODE) continue;
        for (const rate of carrier.rates) {
          if (rate.minDesi != null && rate.minDesi > 1) continue;
          if (rate.maxDesi != null && rate.maxDesi < 1) continue;
          rates.push({ priceMinor: rate.priceMinor, freeOverMinor: rate.freeOverMinor });
        }
      }
      return { storeFreeOverMinor, rates };
    },
    ["store-shipping-summary-v1", siteId, String(geliverEnabled), String(storeFreeOverMinor)],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeSettingsTag(siteId), storeMirrorTag(siteId)],
    },
  )();
}

/**
 * Tek adet ürün siparişinde ödenecek en düşük kargo ücreti.
 * Aktif tarife yoksa `null` (yapısal veriye kargo bilgisi yazılmaz).
 */
export function resolveShippingCostMinor(
  summary: StoreShippingSummary,
  priceMinor: number,
): number | null {
  if (summary.storeFreeOverMinor != null && priceMinor >= summary.storeFreeOverMinor) return 0;
  if (!summary.rates.length) return null;
  return Math.min(
    ...summary.rates.map((rate) =>
      rate.freeOverMinor != null && priceMinor >= rate.freeOverMinor ? 0 : rate.priceMinor,
    ),
  );
}
