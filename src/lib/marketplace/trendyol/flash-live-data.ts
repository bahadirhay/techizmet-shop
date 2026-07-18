import "server-only";

import { getCachedParsedSiteSettings } from "@/lib/cache/store-cache";
import { getIntegrationConfig } from "@/lib/marketplace/actions";
import { resolveProductCommission } from "@/lib/marketplace/commission-rules";
import type { ResolvedCommissionRule } from "@/lib/marketplace/commission-types";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import { lookupTrendyolProductByBarcode } from "@/lib/marketplace/trendyol/products";
import { prisma } from "@/lib/prisma";

const SETTLEMENT_COMMISSION_NOTE = "trendyol-settlement-commission";

export type TrendyolFlashLiveData = {
  barcode: string | null;
  liveSalePriceMinor: number | null;
  liveListPriceMinor: number | null;
  listingStatus: string | null;
  /** Settlement geçmişinden türetilen efektif komisyon % */
  effectiveCommissionPercent: number | null;
  commissionSampleOrders: number;
  commissionSource: "product_settlement" | "platform_settlement" | "rule" | "none";
  rule: ResolvedCommissionRule;
  fixedFeeMinor: number;
  packagingCostMinor: number;
  warnings: string[];
};

function tyTlToMinor(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

async function resolveBarcode(siteId: string, productId: string | null, barcodeHint: string | null) {
  const hint = barcodeHint?.trim() || null;
  if (hint) return hint;
  if (!productId) return null;

  const listing = await prisma.marketplaceProductListing.findFirst({
    where: { siteId, productId, platform: "trendyol" },
    select: { barcode: true },
  });
  if (listing?.barcode?.trim()) return listing.barcode.trim();

  const product = await prisma.storeProduct.findFirst({
    where: { id: productId, siteId },
    select: { barcode: true },
  });
  return product?.barcode?.trim() || null;
}

type CommissionSample = { commissionMinor: number; grossMinor: number };

async function loadSettlementCommissionSamples(
  siteId: string,
  productId: string | null,
  sinceDays: number,
): Promise<{ productSamples: CommissionSample[]; platformSamples: CommissionSample[] }> {
  const since = new Date(Date.now() - sinceDays * 86400000);

  const deductions = await prisma.financeTransaction.findMany({
    where: {
      siteId,
      kind: "marketplace_deduction",
      marketplacePlatform: "trendyol",
      notes: SETTLEMENT_COMMISSION_NOTE,
      reconciliationStatus: "matched",
      orderId: { not: null },
      txDate: { gte: since },
      amountMinor: { gt: 0 },
    },
    select: {
      amountMinor: true,
      order: {
        select: {
          id: true,
          totalMinor: true,
          lines: { select: { productId: true, lineMinor: true } },
        },
      },
    },
    take: 400,
    orderBy: { txDate: "desc" },
  });

  const productSamples: CommissionSample[] = [];
  const platformSamples: CommissionSample[] = [];

  for (const d of deductions) {
    const order = d.order;
    if (!order || order.totalMinor <= 0 || d.amountMinor <= 0) continue;
    platformSamples.push({ commissionMinor: d.amountMinor, grossMinor: order.totalMinor });

    if (!productId) continue;
    const lines = order.lines.filter((l) => l.productId === productId && l.lineMinor > 0);
    if (!lines.length) continue;
    const productLineMinor = lines.reduce((s, l) => s + l.lineMinor, 0);
    // Sipariş komisyonunu ürün satır payına göre dağıt
    const share = Math.min(1, productLineMinor / order.totalMinor);
    productSamples.push({
      commissionMinor: Math.round(d.amountMinor * share),
      grossMinor: productLineMinor,
    });
  }

  return { productSamples, platformSamples };
}

function averageCommissionPercent(samples: CommissionSample[]): number | null {
  const gross = samples.reduce((s, x) => s + x.grossMinor, 0);
  const commission = samples.reduce((s, x) => s + x.commissionMinor, 0);
  if (gross <= 0 || commission <= 0) return null;
  return Math.round((commission / gross) * 10000) / 100;
}

/**
 * Flash simülatörü için Trendyol canlı fiyat + settlement efektif komisyon.
 * Ürün maliyeti ve hedef flash fiyatı kullanıcıda kalır.
 */
export async function loadTrendyolFlashLiveData(input: {
  siteId: string;
  productId?: string | null;
  barcode?: string | null;
  categoryId?: string | null;
  sinceDays?: number;
}): Promise<TrendyolFlashLiveData> {
  const warnings: string[] = [];
  const siteId = input.siteId;
  const productId = input.productId?.trim() || null;
  const categoryId = input.categoryId?.trim() || null;
  const sinceDays = input.sinceDays ?? 60;

  const rule = await resolveProductCommission(siteId, "trendyol", categoryId);
  const settings = await getCachedParsedSiteSettings(siteId);
  const fixedFeeMinor = Math.max(0, settings.finance?.trendyolFixedFeeMinor ?? 0);
  const packagingCostMinor = Math.max(0, settings.finance?.packagingCostMinor ?? 0);

  const barcode = await resolveBarcode(siteId, productId, input.barcode ?? null);

  let liveSalePriceMinor: number | null = null;
  let liveListPriceMinor: number | null = null;
  let listingStatus: string | null = null;

  const config = await getIntegrationConfig(siteId, "trendyol");
  const creds = config ? parseTrendyolConfig(config) : null;

  if (!creds) {
    warnings.push("Trendyol entegrasyonu / API bilgisi eksik — canlı fiyat çekilemedi.");
  } else if (!barcode) {
    warnings.push("Barkod yok — Trendyol canlı fiyatı için barkod gerekli.");
  } else {
    try {
      const listing = await lookupTrendyolProductByBarcode(creds, barcode);
      if (!listing) {
        warnings.push(`Trendyol'da barkod bulunamadı: ${barcode}`);
      } else {
        listingStatus = listing.listingStatus;
        liveSalePriceMinor = tyTlToMinor(listing.meta?.salePrice);
        liveListPriceMinor = tyTlToMinor(listing.meta?.listPrice);
        if (liveSalePriceMinor == null) {
          warnings.push("Trendyol ürününde satış fiyatı yok.");
        }
      }
    } catch {
      warnings.push("Trendyol ürün sorgusu başarısız oldu.");
    }
  }

  const { productSamples, platformSamples } = await loadSettlementCommissionSamples(
    siteId,
    productId,
    sinceDays,
  );

  let effectiveCommissionPercent: number | null = null;
  let commissionSampleOrders = 0;
  let commissionSource: TrendyolFlashLiveData["commissionSource"] = "none";

  const productAvg = productSamples.length >= 3 ? averageCommissionPercent(productSamples) : null;
  if (productAvg != null) {
    effectiveCommissionPercent = productAvg;
    commissionSampleOrders = productSamples.length;
    commissionSource = "product_settlement";
  } else {
    const platformAvg =
      platformSamples.length >= 5 ? averageCommissionPercent(platformSamples) : null;
    if (platformAvg != null) {
      effectiveCommissionPercent = platformAvg;
      commissionSampleOrders = platformSamples.length;
      commissionSource = "platform_settlement";
      if (productId) {
        warnings.push(
          "Bu ürüne özel yeterli settlement yok — Trendyol genel efektif komisyon kullanıldı.",
        );
      }
    } else if (rule.commissionPercent > 0) {
      effectiveCommissionPercent =
        rule.commissionPercent + (rule.extraCommissionPercent ?? 0);
      commissionSource = "rule";
      warnings.push(
        "Settlement komisyon geçmişi yok — paneldeki komisyon kuralı kullanıldı. Finans → Trendyol hakediş aktarımı sonrası gerçekleşen oran gelir.",
      );
    }
  }

  return {
    barcode,
    liveSalePriceMinor,
    liveListPriceMinor,
    listingStatus,
    effectiveCommissionPercent,
    commissionSampleOrders,
    commissionSource,
    rule,
    fixedFeeMinor,
    packagingCostMinor,
    warnings,
  };
}
