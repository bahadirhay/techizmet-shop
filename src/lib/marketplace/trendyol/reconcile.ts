import "server-only";

import type { TrendyolCredentials } from "@/lib/marketplace/trendyol/client";
import { checkTrendyolBatchRequest } from "@/lib/marketplace/trendyol/categories";
import { lookupTrendyolProductByBarcode } from "@/lib/marketplace/trendyol/products";
import { marketplaceProductListingDb } from "@/lib/marketplace/prisma-marketplace";
import { prisma } from "@/lib/prisma";

export type ReconcileResult = {
  ok: boolean;
  checked: number;
  foundOnTrendyol: number;
  active: number;
  pending: number;
  rejected: number;
  notFound: number;
  batchFailed: number;
  message: string;
  details: string[];
};

type ListingRow = {
  id: string;
  productId: string;
  barcode: string | null;
  listingStatus: string;
  metaJson: string | null;
};

/** Batch sonuçlarını + Trendyol barkod sorgusunu birleştirerek gerçek durumu yazar. */
export async function reconcileTrendyolListings(
  siteId: string,
  creds: TrendyolCredentials,
  options?: { statuses?: string[] },
): Promise<ReconcileResult> {
  const listingDb = marketplaceProductListingDb();
  if (!listingDb) {
    return {
      ok: false,
      checked: 0,
      foundOnTrendyol: 0,
      active: 0,
      pending: 0,
      rejected: 0,
      notFound: 0,
      batchFailed: 0,
      message: "Pazaryeri tabloları hazır değil",
      details: [],
    };
  }

  const statuses = options?.statuses ?? ["pending", "exported", "inactive"];
  const listings = await prisma.marketplaceProductListing.findMany({
    where: { siteId, platform: "trendyol", listingStatus: { in: statuses } },
    select: { id: true, productId: true, barcode: true, listingStatus: true, metaJson: true },
  });

  const now = new Date();
  let foundOnTrendyol = 0;
  let active = 0;
  let pending = 0;
  let rejected = 0;
  let notFound = 0;
  let batchFailed = 0;
  const details: string[] = [];

  // Batch'ten reddedilen barkodlar
  const batchRejected = new Map<string, string>();
  const batchAccepted = new Set<string>();

  const byBatch = new Map<string, ListingRow[]>();
  for (const l of listings) {
    let batchId = "";
    try {
      batchId = (JSON.parse(l.metaJson ?? "{}") as { batchRequestId?: string }).batchRequestId ?? "";
    } catch {
      batchId = "";
    }
    if (!batchId) continue;
    const arr = byBatch.get(batchId) ?? [];
    arr.push(l);
    byBatch.set(batchId, arr);
  }

  for (const [batchId, batchListings] of byBatch) {
    const batch = await checkTrendyolBatchRequest(creds, batchId);
    if (!batch.ok) continue;

    for (const it of batch.items) {
      const bc = it.barcode.trim();
      if (!bc) continue;
      if (it.status === "FAILED") {
        batchRejected.set(bc, it.failureReasons.join("; ") || "Trendyol batch reddetti");
      } else if (it.status === "SUCCESS") {
        batchAccepted.add(bc);
      }
    }

    for (const l of batchListings) {
      const bc = l.barcode?.trim();
      if (!bc) continue;
      const failReason = batchRejected.get(bc);
      if (failReason) {
        batchFailed++;
        rejected++;
        details.push(`✗ ${bc}: ${failReason}`);
        await listingDb.update({
          where: { id: l.id },
          data: { listingStatus: "rejected", lastError: failReason, lastSyncAt: now },
        });
      }
    }
  }

  // Trendyol API'den barkodla doğrula
  for (const l of listings) {
    const bc = l.barcode?.trim();
    if (!bc) {
      if (l.listingStatus === "pending") {
        rejected++;
        details.push(`✗ (barkod yok): ürün kaydı`);
        await listingDb.update({
          where: { id: l.id },
          data: {
            listingStatus: "rejected",
            lastError: "Barkod eksik — Trendyol'da aranamadı",
            lastSyncAt: now,
          },
        });
      }
      continue;
    }

    const batchFail = batchRejected.get(bc);
    if (batchFail) continue;

    const ty = await lookupTrendyolProductByBarcode(creds, bc);
    if (ty) {
      foundOnTrendyol++;
      const status = ty.listingStatus;
      const err = ty.lastError ?? null;
      if (status === "active") active++;
      else if (status === "rejected") rejected++;
      else pending++;

      const note =
        status === "active"
          ? "yayında"
          : status === "rejected"
            ? `reddedildi${err ? `: ${err.slice(0, 80)}` : ""}`
            : "Trendyol onay kuyruğunda";
      details.push(`✓ ${bc}: ${note}`);

      await listingDb.update({
        where: { id: l.id },
        data: {
          listingStatus: status,
          lastError: err,
          lastSyncAt: now,
          ...(ty.meta || ty.title
            ? { metaJson: JSON.stringify({ title: ty.title, ...ty.meta }) }
            : {}),
        },
      });
    } else if (batchAccepted.has(bc)) {
      pending++;
      details.push(`○ ${bc}: batch kabul etti, TY'de henüz görünmüyor`);
      await listingDb.update({
        where: { id: l.id },
        data: {
          listingStatus: "pending",
          lastError: "Batch kabul edildi; Trendyol listesinde henüz yok — birkaç dakika sonra tekrar doğrulayın",
          lastSyncAt: now,
        },
      });
    } else {
      notFound++;
      rejected++;
      const err =
        "Trendyol mağazasında bu barkodla ürün yok. Gönderim başarısız veya farklı barkod kullanılmış olabilir.";
      details.push(`✗ ${bc}: Trendyol'da bulunamadı`);
      await listingDb.update({
        where: { id: l.id },
        data: { listingStatus: "rejected", lastError: err, lastSyncAt: now },
      });
    }
  }

  const checked = listings.length;
  const message =
    checked === 0
      ? "Doğrulanacak bekleyen ürün yok"
      : `${checked} kontrol · ${foundOnTrendyol} TY'de var (${active} yayında, ${pending} onayda) · ${notFound} yok · ${batchFailed} batch hatası`;

  return {
    ok: true,
    checked,
    foundOnTrendyol,
    active,
    pending,
    rejected,
    notFound,
    batchFailed,
    message,
    details: details.slice(0, 25),
  };
}
