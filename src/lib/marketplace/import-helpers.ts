import type { Prisma } from "@prisma/client";
import { buildBundleOrderLineMeta, deductProductStock } from "@/lib/product-bundle";
import { prisma } from "@/lib/prisma";

export function tryMinorFromTry(amount: number | undefined, fallback = 0): number {
  if (amount == null || !Number.isFinite(amount)) return fallback;
  return Math.round(amount * 100);
}

export function pickMoneyMinor(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return tryMinorFromTry(raw);
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return tryMinorFromTry(Number(obj.amount ?? obj.Amount ?? 0));
  }
  return 0;
}

export async function findProductByBarcodeOrSku(
  siteId: string,
  barcode?: string,
  sku?: string,
) {
  if (barcode?.trim()) {
    const byBarcode = await prisma.storeProduct.findFirst({
      where: { siteId, barcode: barcode.trim() },
    });
    if (byBarcode) return byBarcode;
  }
  if (sku?.trim()) {
    const bySku = await prisma.storeProduct.findFirst({
      where: { siteId, OR: [{ sku: sku.trim() }, { slug: sku.trim() }] },
    });
    if (bySku) return bySku;
  }
  return null;
}

export async function marketplaceOrderLineExtras(
  db: Prisma.TransactionClient | typeof prisma,
  productId: string | null,
  qty: number,
) {
  if (!productId) {
    return {
      lineKind: "standard",
      bundleProductId: null as string | null,
      componentsSnapshotJson: null as string | null,
    };
  }
  return buildBundleOrderLineMeta(db, productId, qty);
}

export async function deductMarketplaceLineStock(
  db: Prisma.TransactionClient,
  productId: string,
  qty: number,
  lineTitle: string,
): Promise<{ ok: boolean; componentProductIds: string[] }> {
  return deductProductStock(db, productId, qty, lineTitle);
}

export function mapMarketplaceStatus(platform: string, raw?: string | null): string {
  const s = (raw ?? "").toLowerCase();
  if (platform === "amazon_tr") {
    if (s.includes("shipped")) return "shipped";
    if (s.includes("cancel")) return "cancelled";
    if (s.includes("pending") || s.includes("unshipped")) return "confirmed";
    return "pending";
  }
  if (platform === "hepsiburada") {
    if (s.includes("deliver")) return "delivered";
    if (s.includes("ship") || s.includes("cargo")) return "shipped";
    if (s.includes("cancel")) return "cancelled";
    return "pending";
  }
  return "pending";
}
