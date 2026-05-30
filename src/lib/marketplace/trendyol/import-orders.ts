import { prisma } from "@/lib/prisma";
import { resolveMarketplaceSalePriceMinor } from "@/lib/marketplace/product-prices";
import { applyOrderFinanceSnapshot } from "@/lib/finance/order-economics";
import { marketplacePackageRef, type MarketplaceOrderMeta } from "@/lib/marketplace/types";
import type { TrendyolShipmentPackage } from "@/lib/marketplace/trendyol/orders";

function tryMinorFromTry(amount: number | undefined, fallback = 0): number {
  if (amount == null || !Number.isFinite(amount)) return fallback;
  return Math.round(amount * 100);
}

async function findProductByBarcodeOrSku(
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

export async function importTrendyolPackages(
  siteId: string,
  packages: TrendyolShipmentPackage[],
): Promise<{ imported: number; skipped: number; productIds: string[]; message: string }> {
  let imported = 0;
  let skipped = 0;
  const notes: string[] = [];
  const touchedProductIds = new Set<string>();

  for (const pkg of packages) {
    const ref = marketplacePackageRef("trendyol", pkg.shipmentPackageId);
    const existing = await prisma.storeOrder.findFirst({
      where: { siteId, marketplaceRef: ref },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const meta: MarketplaceOrderMeta = {
      shipmentPackageId: pkg.shipmentPackageId,
      orderNumber: pkg.orderNumber,
      tyStatus: pkg.status,
      lines: pkg.lines.map((l) => ({
        lineId: l.lineId,
        quantity: l.quantity,
        barcode: l.barcode,
        merchantSku: l.merchantSku,
      })),
    };

    const customerName = [
      pkg.shipmentAddress?.firstName ?? pkg.customerFirstName,
      pkg.shipmentAddress?.lastName ?? pkg.customerLastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const orderLines: {
      productId: string | null;
      title: string;
      sku: string | null;
      qty: number;
      unitMinor: number;
      lineMinor: number;
      vatRate: number | null;
    }[] = [];

    for (const line of pkg.lines) {
      const product = await findProductByBarcodeOrSku(siteId, line.barcode, line.merchantSku);
      const unitMinor = product
        ? resolveMarketplaceSalePriceMinor(product, "trendyol")
        : tryMinorFromTry(line.price);
      orderLines.push({
        productId: product?.id ?? null,
        title: line.productName ?? product?.title ?? `Trendyol #${line.lineId}`,
        sku: line.merchantSku ?? line.barcode ?? product?.sku ?? null,
        qty: line.quantity,
        unitMinor,
        lineMinor: unitMinor * line.quantity,
        vatRate: product?.vatRate ?? null,
      });
    }

    const subtotalMinor = orderLines.reduce((s, l) => s + l.lineMinor, 0);

    const createdOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.storeOrder.create({
        data: {
          siteId,
          orderNumber: `TY-${pkg.orderNumber}-${pkg.shipmentPackageId}`,
          status: "pending",
          customerName: customerName || "Trendyol Müşteri",
          customerEmail: pkg.customerEmail ?? null,
          customerPhone: pkg.customerPhone ?? null,
          shippingAddressJson: pkg.shipmentAddress
            ? JSON.stringify({
                line1: pkg.shipmentAddress.address1 ?? "",
                city: pkg.shipmentAddress.city ?? "",
                district: pkg.shipmentAddress.district ?? "",
                postalCode: pkg.shipmentAddress.postalCode ?? "",
              })
            : null,
          subtotalMinor,
          totalMinor: subtotalMinor,
          paymentMethod: "marketplace",
          paymentStatus: "paid",
          trackingNumber: pkg.cargoTrackingNumber ?? null,
          marketplaceRef: ref,
          marketplacePlatform: "trendyol",
          marketplaceMetaJson: JSON.stringify(meta),
          adminNotes: `Trendyol sipariş ${pkg.orderNumber} · paket ${pkg.shipmentPackageId}`,
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
        if (updated.count === 0) {
          notes.push(`${line.title}: stok yetersiz, sipariş yine de alındı`);
        }
      }

      return created;
    });

    try {
      await applyOrderFinanceSnapshot(siteId, createdOrder.id);
    } catch {
      /* snapshot hatası importu durdurmaz */
    }

    imported++;
  }

  return {
    imported,
    skipped,
    productIds: [...touchedProductIds],
    message:
      imported || skipped
        ? `${imported} yeni sipariş, ${skipped} atlandı (zaten var)${notes.length ? ` · ${notes.slice(0, 3).join("; ")}` : ""}`
        : "Yeni sipariş yok",
  };
}
