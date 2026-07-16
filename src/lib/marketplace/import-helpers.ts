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

/**
 * Pazaryeri siparişi için stok hareketi yazar (satış çıkışı).
 * İptal/iade onayında restoreOrderStockMovements ile geri alınır.
 */
export async function recordMarketplaceOrderStock(
  db: Prisma.TransactionClient,
  params: {
    siteId: string;
    orderId: string;
    lines: {
      id: string;
      productId: string | null;
      variantId?: string | null;
      qty: number;
      title: string;
    }[];
  },
): Promise<{ ok: boolean; productIds: string[]; warnings: string[] }> {
  const { recordOrderStockMovements } = await import("@/lib/stock/order-stock");
  const productIds = [
    ...new Set(params.lines.map((l) => l.productId).filter((id): id is string => Boolean(id))),
  ];
  if (!productIds.length) return { ok: true, productIds: [], warnings: [] };

  const products = await db.storeProduct.findMany({
    where: { id: { in: productIds }, siteId: params.siteId },
    select: { id: true, kind: true },
  });
  const productKinds = new Map(products.map((p) => [p.id, p.kind ?? "standard"]));
  const warnings: string[] = [];

  try {
    await recordOrderStockMovements(db, {
      siteId: params.siteId,
      orderId: params.orderId,
      lines: params.lines
        .filter((l): l is typeof l & { productId: string } => Boolean(l.productId))
        .map((l) => ({
          id: l.id,
          productId: l.productId,
          variantId: l.variantId ?? null,
          qty: l.qty,
          title: l.title,
        })),
      productKinds,
      allowNegative: true,
    });
  } catch (e) {
    warnings.push(e instanceof Error ? e.message : "Stok düşümü başarısız");
    return { ok: false, productIds, warnings };
  }

  return { ok: true, productIds, warnings };
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
