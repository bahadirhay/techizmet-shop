import { prisma } from "@/lib/prisma";
import { applyOrderFinanceSnapshot } from "@/lib/finance/order-economics";
import { findProductByBarcodeOrSku, mapMarketplaceStatus } from "@/lib/marketplace/import-helpers";
import { resolveMarketplaceSalePriceMinor } from "@/lib/marketplace/product-prices";
import { marketplacePackageRef } from "@/lib/marketplace/types";
import type { HepsiburadaPackage } from "@/lib/marketplace/hepsiburada/orders";

export type HepsiburadaOrderMeta = {
  platform: "hepsiburada";
  orderNumber: string;
  packageNumber: string;
  hbStatus?: string;
  lines: { lineId: string; quantity: number; merchantSku?: string; barcode?: string }[];
};

export async function importHepsiburadaPackages(
  siteId: string,
  packages: HepsiburadaPackage[],
): Promise<{ imported: number; skipped: number; productIds: string[]; message: string }> {
  let imported = 0;
  let skipped = 0;
  const notes: string[] = [];
  const touchedProductIds = new Set<string>();

  for (const pkg of packages) {
    const ref = marketplacePackageRef("hepsiburada", pkg.packageNumber);
    const existing = await prisma.storeOrder.findFirst({
      where: { siteId, marketplaceRef: ref },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const meta: HepsiburadaOrderMeta = {
      platform: "hepsiburada",
      orderNumber: pkg.orderNumber,
      packageNumber: pkg.packageNumber,
      hbStatus: pkg.status,
      lines: pkg.lines.map((l) => ({
        lineId: l.lineId,
        quantity: l.quantity,
        merchantSku: l.merchantSku,
        barcode: l.barcode,
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

    for (const line of pkg.lines) {
      const product = await findProductByBarcodeOrSku(siteId, line.barcode, line.merchantSku ?? line.hbSku);
      const unitMinor = product
        ? resolveMarketplaceSalePriceMinor(product, "hepsiburada")
        : line.unitMinor;
      orderLines.push({
        productId: product?.id ?? null,
        title: line.productName ?? product?.title ?? `HB ${line.lineId}`,
        sku: line.merchantSku ?? line.hbSku ?? line.barcode ?? product?.sku ?? null,
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
          orderNumber: `HB-${pkg.orderNumber}-${pkg.packageNumber}`,
          status: mapMarketplaceStatus("hepsiburada", pkg.status),
          customerName: pkg.customerName || "Hepsiburada Müşteri",
          customerEmail: pkg.customerEmail ?? null,
          customerPhone: pkg.customerPhone ?? null,
          shippingAddressJson: pkg.shippingAddress
            ? JSON.stringify({
                line1: pkg.shippingAddress.line1 ?? "",
                city: pkg.shippingAddress.city ?? "",
                district: pkg.shippingAddress.district ?? "",
                postalCode: pkg.shippingAddress.postalCode ?? "",
              })
            : null,
          subtotalMinor,
          totalMinor: subtotalMinor,
          paymentMethod: "marketplace",
          paymentStatus: "paid",
          trackingNumber: pkg.trackingNumber ?? null,
          marketplaceRef: ref,
          marketplacePlatform: "hepsiburada",
          marketplaceMetaJson: JSON.stringify(meta),
          adminNotes: `Hepsiburada sipariş ${pkg.orderNumber} · paket ${pkg.packageNumber}`,
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
          notes.push(`${line.title}: stok yetersiz`);
        }
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
