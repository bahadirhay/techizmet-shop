import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseTrendyolConfig } from "@/lib/marketplace/trendyol/client";
import { checkTrendyolBatchRequest } from "@/lib/marketplace/trendyol/categories";
import { marketplaceProductListingDb } from "@/lib/marketplace/prisma-marketplace";

/** Bekleyen Trendyol gönderimlerinin batch sonucunu yeniden sorgular ve durumları günceller. */
export async function POST() {
  const auth = await requireStaffApi("store.integrations");
  if (auth instanceof NextResponse) return auth;

  const listingDb = marketplaceProductListingDb();
  if (!listingDb) {
    return NextResponse.json({ error: "Pazaryeri tabloları hazır değil (deploy sonrası)." }, { status: 400 });
  }

  const integration = await prisma.marketplaceIntegration.findFirst({
    where: { siteId: auth.siteId, platform: "trendyol" },
  });
  if (!integration) {
    return NextResponse.json({ error: "Trendyol entegrasyonu bulunamadı" }, { status: 404 });
  }
  let config: Record<string, string> = {};
  try {
    config = JSON.parse(integration.configJson ?? "{}") as Record<string, string>;
  } catch {
    config = {};
  }
  const creds = parseTrendyolConfig(config);
  if (!creds) {
    return NextResponse.json({ error: "Trendyol API bilgileri eksik" }, { status: 400 });
  }

  const pending = await prisma.marketplaceProductListing.findMany({
    where: { siteId: auth.siteId, platform: "trendyol", listingStatus: "pending" },
    select: { id: true, productId: true, barcode: true, metaJson: true },
  });

  // batchRequestId → o batch'e ait listeler
  const byBatch = new Map<string, typeof pending>();
  for (const l of pending) {
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

  let accepted = 0;
  let rejected = 0;
  let stillPending = 0;
  const now = new Date();

  for (const [batchId, listings] of byBatch) {
    const batch = await checkTrendyolBatchRequest(creds, batchId);
    if (!batch.ok) {
      stillPending += listings.length;
      continue;
    }
    const resultByBarcode = new Map<string, { status: string; error: string | null }>();
    for (const it of batch.items) {
      const bc = it.barcode.trim();
      if (!bc) continue;
      if (it.status === "SUCCESS") resultByBarcode.set(bc, { status: "active", error: null });
      else if (it.status === "FAILED")
        resultByBarcode.set(bc, { status: "rejected", error: it.failureReasons.join("; ") || "Reddedildi" });
    }

    for (const l of listings) {
      const r = l.barcode ? resultByBarcode.get(l.barcode.trim()) : undefined;
      if (!r) {
        stillPending++;
        continue;
      }
      if (r.status === "active") accepted++;
      else rejected++;
      await listingDb.update({
        where: { id: l.id },
        data: { listingStatus: r.status, lastError: r.error, lastSyncAt: now },
      });
    }
  }

  const message = `${accepted} kabul · ${rejected} reddedildi · ${stillPending} hâlâ işleniyor`;
  return NextResponse.json({ ok: true, accepted, rejected, stillPending, message });
}
