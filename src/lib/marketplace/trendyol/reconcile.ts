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

  // Batch sonuçları: FAILED = kesin red, SUCCESS = kesin kabul,
  // henüz sonuçlanmamış (PROCESSING / batch okunamadı) = "işleniyor" (red DEĞİL).
  const batchRejected = new Map<string, string>();
  const batchAccepted = new Set<string>();
  const batchPending = new Set<string>();

  const byBatch = new Map<string, ListingRow[]>();
  const hasBatch = new Set<string>();
  for (const l of listings) {
    let batchId = "";
    try {
      batchId = (JSON.parse(l.metaJson ?? "{}") as { batchRequestId?: string }).batchRequestId ?? "";
    } catch {
      batchId = "";
    }
    if (!batchId) continue;
    hasBatch.add(l.id);
    const arr = byBatch.get(batchId) ?? [];
    arr.push(l);
    byBatch.set(batchId, arr);
  }

  for (const [batchId, batchListings] of byBatch) {
    const batch = await checkTrendyolBatchRequest(creds, batchId);

    const itemByBarcode = new Map<string, { status: string; reasons: string[] }>();
    if (batch.ok) {
      for (const it of batch.items) {
        const bc = it.barcode.trim();
        if (bc) itemByBarcode.set(bc, { status: it.status, reasons: it.failureReasons });
      }
    }

    for (const l of batchListings) {
      const bc = l.barcode?.trim();
      if (!bc) continue;
      const it = itemByBarcode.get(bc);
      if (it?.status === "FAILED") {
        const reason = it.reasons.join("; ") || "Trendyol batch reddetti";
        batchRejected.set(bc, reason);
        batchFailed++;
        rejected++;
        details.push(`✗ ${bc}: ${reason}`);
        await listingDb.update({
          where: { id: l.id },
          data: { listingStatus: "rejected", lastError: reason, lastSyncAt: now },
        });
      } else if (it?.status === "SUCCESS") {
        batchAccepted.add(bc);
      } else {
        // Batch henüz sonuçlanmadı ya da bu barkod batch listesinde yok:
        // Trendyol işliyor olabilir → "reddedildi" DEME, beklemede say.
        batchPending.add(bc);
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
      details.push(`○ ${bc}: Trendyol kabul etti, listeye düşmesi birkaç dk sürebilir`);
      await listingDb.update({
        where: { id: l.id },
        data: {
          listingStatus: "pending",
          lastError:
            "Trendyol kabul etti; katalog listesine düşmesi birkaç dakika sürebilir — sonra tekrar doğrulayın",
          lastSyncAt: now,
        },
      });
    } else if (batchPending.has(bc)) {
      pending++;
      details.push(`○ ${bc}: Trendyol batch'i işleniyor`);
      await listingDb.update({
        where: { id: l.id },
        data: {
          listingStatus: "pending",
          lastError: "Trendyol gönderimi işleniyor — birkaç dakika sonra tekrar doğrulayın",
          lastSyncAt: now,
        },
      });
    } else if (hasBatch.has(l.id)) {
      // Batch kaydı vardı ama sonuç okunamadı ve TY'de de yok → beklemede tut,
      // "reddedildi" deme (Trendyol indeksleme gecikmesi olabilir).
      pending++;
      details.push(`○ ${bc}: durum belirsiz, beklemede`);
      await listingDb.update({
        where: { id: l.id },
        data: {
          listingStatus: "pending",
          lastError: "Trendyol'da henüz görünmüyor — birkaç dakika sonra tekrar doğrulayın",
          lastSyncAt: now,
        },
      });
    } else {
      // Hiç batch kaydı yok ve Trendyol'da da yok → gönderim tamamlanmamış.
      // Bu bir Trendyol reddi DEĞİL; kullanıcının tekrar göndermesi gerekiyor.
      notFound++;
      const err =
        "Trendyol'a gönderim kaydı bulunamadı — bu ürünü tekrar gönderin (\"Seçilenleri gönder\").";
      details.push(`⚠ ${bc}: gönderilmemiş, tekrar gönderin`);
      await listingDb.update({
        where: { id: l.id },
        data: { listingStatus: "exported", lastError: err, lastSyncAt: now },
      });
    }
  }

  const checked = listings.length;
  const message =
    checked === 0
      ? "Doğrulanacak bekleyen ürün yok"
      : `${checked} kontrol · ${foundOnTrendyol} TY'de var (${active} yayında) · ${pending} işleniyor/onay bekliyor · ${rejected} reddedildi (${batchFailed} batch hatası) · ${notFound} gönderilmemiş`;

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
