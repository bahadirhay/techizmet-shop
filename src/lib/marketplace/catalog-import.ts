import { findProductByBarcodeOrSku } from "@/lib/marketplace/import-helpers";
import {
  MARKETPLACE_PRISMA_STALE_MSG,
  marketplaceProductListingDb,
} from "@/lib/marketplace/prisma-marketplace";
import type {
  MarketplaceCatalogImportResult,
  MarketplaceCatalogItem,
} from "@/lib/marketplace/catalog-types";
import { prisma } from "@/lib/prisma";

/** Başlığı karşılaştırma için normalize eder (küçük harf, noktalama sil, boşluk daralt). */
function normalizeTitle(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleTokens(s: string): Set<string> {
  return new Set(normalizeTitle(s).split(" ").filter((t) => t.length >= 2));
}

/** İki başlık arasındaki token Jaccard benzerliği (0-1). */
function titleSimilarity(a: string, b: string): number {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export async function upsertProductMarketplaceListing(
  siteId: string,
  productId: string,
  platform: string,
  data: {
    barcode?: string | null;
    listingStatus: string;
    lastError?: string | null;
    metaJson?: string | null;
  },
): Promise<boolean> {
  const listingDb = marketplaceProductListingDb();
  if (!listingDb) return false;

  const now = new Date();
  await listingDb.upsert({
    where: {
      siteId_platform_productId: { siteId, platform, productId },
    },
    create: {
      siteId,
      platform,
      productId,
      barcode: data.barcode ?? null,
      listingStatus: data.listingStatus,
      lastSyncAt: now,
      lastError: data.lastError ?? null,
      metaJson: data.metaJson ?? null,
    },
    update: {
      barcode: data.barcode ?? null,
      listingStatus: data.listingStatus,
      lastSyncAt: now,
      lastError: data.lastError ?? null,
      metaJson: data.metaJson ?? null,
    },
  });
  return true;
}

export async function importMarketplaceCatalog(
  siteId: string,
  platform: string,
  items: MarketplaceCatalogItem[],
): Promise<MarketplaceCatalogImportResult> {
  const listingDb = marketplaceProductListingDb();
  if (!listingDb) {
    return {
      ok: false,
      itemsCount: 0,
      matched: 0,
      unmatched: items.length,
      message: MARKETPLACE_PRISMA_STALE_MSG,
    };
  }

  // Başlık bazlı eşleştirme için sitedeki ürünleri (barkodsuz olanlar dahil) hazırla
  const localProducts = await prisma.storeProduct.findMany({
    where: { siteId },
    select: { id: true, title: true, barcode: true },
  });
  const usedLocalIds = new Set<string>();

  let matched = 0;
  let unmatched = 0;
  let autoLinked = 0;
  const unmatchedSamples: string[] = [];
  const autoLinkedSamples: string[] = [];

  for (const item of items) {
    let product = await findProductByBarcodeOrSku(siteId, item.barcode, item.sku);

    // Barkod/SKU eşleşmediyse başlıktan eşleştir ve Trendyol barkodunu siteye yaz
    if (!product && item.title?.trim() && item.barcode?.trim()) {
      let best: { id: string; score: number } | null = null;
      for (const lp of localProducts) {
        if (usedLocalIds.has(lp.id)) continue;
        // Sitedeki üründe zaten farklı bir barkod varsa dokunma (yanlış eşleşmeyi önle)
        if (lp.barcode?.trim() && lp.barcode.trim() !== item.barcode.trim()) continue;
        const score = titleSimilarity(item.title, lp.title);
        if (score >= 0.6 && (!best || score > best.score)) best = { id: lp.id, score };
      }
      if (best) {
        await prisma.storeProduct.update({
          where: { id: best.id },
          data: { barcode: item.barcode.trim() },
        });
        usedLocalIds.add(best.id);
        product = await prisma.storeProduct.findUnique({ where: { id: best.id } });
        autoLinked++;
        if (autoLinkedSamples.length < 5) {
          autoLinkedSamples.push(`${item.title.trim()} → barkod ${item.barcode.trim()}`);
        }
      }
    }

    if (!product) {
      unmatched++;
      if (unmatchedSamples.length < 5) {
        const label = item.title?.trim() || item.sku || item.barcode || "?";
        unmatchedSamples.push(`${label}${item.barcode ? ` (barkod ${item.barcode})` : ""}`);
      }
      continue;
    }

    usedLocalIds.add(product.id);
    matched++;
    await upsertProductMarketplaceListing(siteId, product.id, platform, {
      barcode: item.barcode ?? null,
      listingStatus: item.listingStatus,
      lastError: item.lastError ?? null,
      metaJson: item.meta
        ? JSON.stringify({
            title: item.title,
            ...item.meta,
          })
        : item.title
          ? JSON.stringify({ title: item.title })
          : null,
    });
  }

  const ok = matched > 0 || items.length === 0;
  const autoNote = autoLinked
    ? ` · ${autoLinked} ürün başlıktan otomatik eşleştirildi ve Trendyol barkodu siteye yazıldı` +
      (autoLinkedSamples.length ? ` (${autoLinkedSamples.join("; ")})` : "")
    : "";
  const unmatchedNote = unmatched
    ? ` · ${unmatched} ürün eşleşmedi` +
      (unmatchedSamples.length
        ? ` (ör. ${unmatchedSamples.join(", ")}). Bu ürünler Trendyol'da var ama sitede benzer başlıklı ürün bulunamadı — sitedeki ürüne Trendyol barkodunu elle girin.`
        : " — sitedeki ürünlere Trendyol barkodunu elle girin.")
    : "";
  return {
    ok,
    itemsCount: matched,
    matched,
    unmatched,
    message:
      items.length === 0
        ? "Pazaryerinde ürün bulunamadı"
        : `${matched} ürün eşleştirildi${autoNote}${unmatchedNote}`,
  };
}
