import { prisma } from "@/lib/prisma";
import { applyOrderFinanceSnapshot } from "@/lib/finance/order-economics";
import { findProductByBarcodeOrSku, mapMarketplaceStatus } from "@/lib/marketplace/import-helpers";
import { resolveMarketplaceSalePriceMinor } from "@/lib/marketplace/product-prices";
import { amazonOrderRef, type AmazonOrder } from "@/lib/marketplace/amazon/orders";

export type AmazonOrderMeta = {
  platform: "amazon_tr";
  amazonOrderId: string;
  orderNumber: string;
  orderStatus?: string;
  lines: { orderItemId: string; quantity: number; sellerSku?: string; asin?: string }[];
};

export async function importAmazonOrders(
  siteId: string,
  orders: AmazonOrder[],
): Promise<{ imported: number; skipped: number; productIds: string[]; message: string }> {
  let imported = 0;
  let skipped = 0;
  const notes: string[] = [];
  const touchedProductIds = new Set<string>();

  for (const order of orders) {
    const ref = amazonOrderRef(order.amazonOrderId);
    const existing = await prisma.storeOrder.findFirst({
      where: { siteId, marketplaceRef: ref },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const meta: AmazonOrderMeta = {
      platform: "amazon_tr",
      amazonOrderId: order.amazonOrderId,
      orderNumber: order.amazonOrderId,
      orderStatus: order.orderStatus,
      lines: order.lines.map((l) => ({
        orderItemId: l.orderItemId,
        quantity: l.qty,
        sellerSku: l.sellerSku,
        asin: l.asin,
      })),
    };

    const orderLines: {
      productId: string | null;
      title: string;
      sku: string | null;
      qty: number;
      unitMinor: number;
      lineMinor: number;
      vatRate: number | null;
    }[] = [];

    for (const line of order.lines) {
      const product = await findProductByBarcodeOrSku(siteId, undefined, line.sellerSku);
      const unitMinor = product
        ? resolveMarketplaceSalePriceMinor(product, "amazon_tr")
        : line.unitMinor;
      orderLines.push({
        productId: product?.id ?? null,
        title: line.title,
        sku: line.sellerSku ?? product?.sku ?? line.asin ?? null,
        qty: line.qty,
        unitMinor,
        lineMinor: unitMinor * line.qty,
        vatRate: product?.vatRate ?? null,
      });
    }

    const subtotalMinor = orderLines.reduce((s, l) => s + l.lineMinor, 0);

    const createdOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.storeOrder.create({
        data: {
          siteId,
          orderNumber: `AMZ-${order.amazonOrderId}`,
          status: mapMarketplaceStatus("amazon_tr", order.orderStatus),
          customerName: order.shippingAddress?.name || "Amazon Müşteri",
          customerEmail: order.buyerEmail ?? null,
          customerPhone: order.shippingAddress?.phone ?? null,
          shippingAddressJson: order.shippingAddress
            ? JSON.stringify({
                line1: order.shippingAddress.line1 ?? "",
                city: order.shippingAddress.city ?? "",
                district: order.shippingAddress.district ?? "",
                postalCode: order.shippingAddress.postalCode ?? "",
              })
            : null,
          subtotalMinor,
          totalMinor: subtotalMinor,
          paymentMethod: "marketplace",
          paymentStatus: "paid",
          marketplaceRef: ref,
          marketplacePlatform: "amazon_tr",
          marketplaceMetaJson: JSON.stringify(meta),
          adminNotes: `Amazon sipariş ${order.amazonOrderId}`,
          lines: {
            create: orderLines.map((l) => ({
              productId: l.productId,
              title: l.title,
              sku: l.sku,
              qty: l.qty,
              unitMinor: l.unitMinor,
              lineMinor: l.lineMinor,
              vatRate: l.vatRate,
            })),
          },
        },
      });

      for (const line of orderLines) {
        if (!line.productId) continue;
        touchedProductIds.add(line.productId);
        const updated = await tx.storeProduct.updateMany({
          where: { id: line.productId, stockQty: { gte: line.qty } },
          data: { stockQty: { decrement: line.qty } },
        });
        if (updated.count === 0) notes.push(`${line.title}: stok yetersiz`);
      }

      return created;
    });

    try {
      await applyOrderFinanceSnapshot(siteId, createdOrder.id);
    } catch {
      /* ignore */
    }

    imported++;
  }

  return {
    imported,
    skipped,
    productIds: [...touchedProductIds],
    message:
      imported || skipped
        ? `${imported} yeni sipariş, ${skipped} atlandı${notes.length ? ` · ${notes.slice(0, 3).join("; ")}` : ""}`
        : "Yeni sipariş yok",
  };
}
