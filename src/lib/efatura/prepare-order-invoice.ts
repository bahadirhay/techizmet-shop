import "server-only";

import { buildInvoiceDetailsFromOrder } from "@/lib/efatura/build-invoice";
import type { ResolvedEfaturaConfig } from "@/lib/efatura/settings";
import { parseComponentsSnapshotJson } from "@/lib/product-bundle";
import { prisma } from "@/lib/prisma";

type StoredLine = {
  title: string;
  qty: number;
  lineMinor: number;
  discountMinor?: number;
  vatRate?: number | null;
  lineKind?: string | null;
  componentsSnapshotJson?: string | null;
};

/**
 * Paket satırını faturada içeriğe açar. Sipariş satırı paket olarak kalır.
 * Ağırlık, sipariş anı katalog fiyatı; eski kayıtlarda güncel raf fiyatı, o da yoksa maliyet.
 */
export async function buildInvoiceDetailsFromStoredOrder(
  order: {
    orderNumber: string;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    shippingAddressJson: string | null;
    billingAddressJson?: string | null;
    billingTaxId?: string | null;
    billingTaxOffice?: string | null;
    shippingMinor: number;
    discountMinor: number;
    subtotalMinor?: number;
    totalMinor: number;
    createdAt: Date;
    lines: StoredLine[];
  },
  config: ResolvedEfaturaConfig,
  recipientTaxId?: string,
) {
  const snapshots = order.lines.map((line) =>
    line.lineKind === "bundle" ? parseComponentsSnapshotJson(line.componentsSnapshotJson) : [],
  );
  const missingIds = [
    ...new Set(
      snapshots.flatMap((rows) =>
        rows.filter((c) => c.unitPriceMinor == null || c.unitPriceMinor <= 0).map((c) => c.productId),
      ),
    ),
  ];
  const catalog = new Map<string, { priceMinor: number; vatRate: number; costMinor: number | null }>();
  if (missingIds.length) {
    const rows = await prisma.storeProduct.findMany({
      where: { id: { in: missingIds } },
      select: { id: true, priceMinor: true, vatRate: true, costMinor: true },
    });
    for (const row of rows) {
      catalog.set(row.id, {
        priceMinor: row.priceMinor,
        vatRate: row.vatRate,
        costMinor: row.costMinor,
      });
    }
  }

  const lines = order.lines.map((line, index) => {
    const components = snapshots[index] ?? [];
    return {
      ...line,
      invoiceComponents: components.map((c) => {
        const live = catalog.get(c.productId);
        const unit =
          c.unitPriceMinor != null && c.unitPriceMinor > 0
            ? c.unitPriceMinor
            : live?.priceMinor && live.priceMinor > 0
              ? live.priceMinor
              : c.costMinor && c.costMinor > 0
                ? c.costMinor
                : live?.costMinor && live.costMinor > 0
                  ? live.costMinor
                  : 1;
        const vat = c.vatRate ?? live?.vatRate ?? line.vatRate ?? config.defaultVatRate;
        return {
          title: c.title,
          qty: c.qty,
          vatRate: vat,
          weightMinor: unit * c.qty,
        };
      }),
    };
  });

  return buildInvoiceDetailsFromOrder({ ...order, lines }, config, recipientTaxId);
}
