import { prisma } from "@/lib/prisma";
import { resolveMarketplaceSalePriceMinor } from "@/lib/marketplace/product-prices";
import {
  applyOrderFinanceSnapshot,
  parseOrderFinanceSnapshot,
} from "@/lib/finance/order-economics";
import {
  deductMarketplaceLineStock,
  findProductByBarcodeOrSku,
  marketplaceOrderLineExtras,
} from "@/lib/marketplace/import-helpers";
import { marketplacePackageRef, type MarketplaceOrderMeta } from "@/lib/marketplace/types";
import type { TrendyolShipmentPackage } from "@/lib/marketplace/trendyol/orders";
import { withDeliveredAt, withShippedAt } from "@/lib/orders/shipment-meta";

function tryMinorFromTry(amount: number | undefined, fallback = 0): number {
  if (amount == null || !Number.isFinite(amount)) return fallback;
  return Math.round(amount * 100);
}

/**
 * Trendyol satırının faturalanacak net tutarı (KDV dâhil, kuruş).
 * Trendyol `price` = indirim uygulanmış birim fiyat; bu, panelde görünen
 * "Faturalanacak Tutar" ile birebir eşleşir. `price` yoksa liste fiyatından
 * (amount) satıcı + Trendyol indirimlerini düşerek hesaplarız.
 */
function trendyolLineNetMinor(line: {
  quantity: number;
  price?: number;
  amount?: number;
  discount?: number;
  tyDiscount?: number;
}): number {
  const qty = line.quantity > 0 ? line.quantity : 1;
  if (line.price != null && Number.isFinite(line.price) && line.price > 0) {
    return Math.round(line.price * qty * 100);
  }
  if (line.amount != null && Number.isFinite(line.amount)) {
    const gross = line.amount * qty;
    const disc = (line.discount ?? 0) + (line.tyDiscount ?? 0);
    return Math.round(Math.max(0, gross - disc) * 100);
  }
  return 0;
}

/** Trendyol sevkiyat paketi durumu → yerel sipariş durumu. */
function trendyolStatusToLocal(tyStatus: string | undefined): string {
  switch (tyStatus) {
    case "Created":
    case "UnPacked":
      return "pending";
    case "Picking":
    case "Invoiced":
      return "confirmed";
    case "Shipped":
    case "AtCollectionPoint":
      return "shipped";
    case "Delivered":
      return "delivered";
    case "Cancelled":
    case "UnSupplied":
      return "cancelled";
    case "Returned":
    case "UnDelivered":
    case "UnDeliveredAndReturned":
      return "refunded";
    default:
      return "pending";
  }
}

/** Yalnızca sevkiyat öncesi durumlarda iç stok düşülür (geçmiş siparişlerde çift düşümü önler). */
const PRE_SHIPMENT_STATUSES = new Set(["pending", "confirmed"]);

/**
 * Trendyol kargo bilgisini shipmentMetaJson için hazırlar (kargo firması,
 * takip no, doğrudan takip linki, gönderi no). Hiç kargo bilgisi yoksa null.
 */
function buildTrendyolShipmentMeta(pkg: TrendyolShipmentPackage): string | null {
  if (!pkg.cargoTrackingNumber && !pkg.cargoTrackingLink && !pkg.cargoProviderName) {
    return null;
  }
  return JSON.stringify({
    source: "trendyol",
    carrier: pkg.cargoProviderName ?? null,
    trackingNumber: pkg.cargoTrackingNumber ?? null,
    trackingUrl: pkg.cargoTrackingLink ?? null,
    senderNumber: pkg.cargoSenderNumber ?? null,
  });
}

/**
 * Zaten içe aktarılmış (faturası kesilmemiş) bir Trendyol siparişinin satır
 * tutarlarını Trendyol'un güncel net fiyatlarına göre onarır. Böylece eski,
 * yanlış (katalog fiyatı) tutarlarla çekilmiş siparişler yeniden çekince
 * "Faturalanacak Tutar" ile hizalanır. Stok/durum değiştirmez.
 */
async function repairExistingTrendyolOrder(
  siteId: string,
  orderId: string,
  pkg: TrendyolShipmentPackage,
): Promise<boolean> {
  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    include: { lines: { orderBy: { id: "asc" } } },
  });
  if (!order) return false;

  let changed = false;

  // Trendyol durum + kargo — fatura tutarından bağımsız, her yeniden çekmede güncelle.
  const localStatus = trendyolStatusToLocal(pkg.status);
  const trackingNumber = pkg.cargoTrackingNumber ?? order.trackingNumber ?? null;
  let shipmentMetaJson = buildTrendyolShipmentMeta(pkg) ?? order.shipmentMetaJson ?? null;
  if (localStatus === "shipped" || localStatus === "delivered") {
    shipmentMetaJson = withShippedAt(shipmentMetaJson);
  }
  if (localStatus === "delivered") {
    shipmentMetaJson = withDeliveredAt(shipmentMetaJson);
  }

  let marketplaceMetaJson = order.marketplaceMetaJson;
  try {
    const meta = order.marketplaceMetaJson
      ? (JSON.parse(order.marketplaceMetaJson) as MarketplaceOrderMeta)
      : ({
          shipmentPackageId: pkg.shipmentPackageId,
          orderNumber: pkg.orderNumber,
          tyStatus: pkg.status,
          lines: [],
        } satisfies MarketplaceOrderMeta);
    meta.tyStatus = pkg.status;
    const nextMetaJson = JSON.stringify(meta);
    if (nextMetaJson !== order.marketplaceMetaJson) marketplaceMetaJson = nextMetaJson;
  } catch {
    /* meta bozuksa atla */
  }

  if (
    order.status !== localStatus ||
    order.trackingNumber !== trackingNumber ||
    order.shipmentMetaJson !== shipmentMetaJson ||
    marketplaceMetaJson !== order.marketplaceMetaJson
  ) {
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        status: localStatus,
        trackingNumber,
        shipmentMetaJson,
        marketplaceMetaJson,
      },
    });
    changed = true;
  }

  // Fatura kesilmişse tutarlara dokunma (durum/kargo yukarıda güncellendi).
  if (order.invoiceStatus && ["signed", "marketplace_sent"].includes(order.invoiceStatus)) {
    return changed;
  }
  // Satır sayıları eşleşmiyorsa güvenli tarafta kal (eşleştirme belirsiz).
  if (order.lines.length !== pkg.lines.length) return changed;

  let subtotalMinor = 0;
  for (let i = 0; i < pkg.lines.length; i++) {
    const tl = pkg.lines[i]!;
    const item = order.lines[i]!;
    const qty = tl.quantity > 0 ? tl.quantity : item.qty || 1;
    let lineMinor = trendyolLineNetMinor(tl);
    if (lineMinor <= 0) {
      subtotalMinor += item.lineMinor;
      continue;
    }
    const unitMinor = Math.round(lineMinor / qty);
    const vatRate = tl.vatRate != null ? Math.round(tl.vatRate) : item.vatRate ?? null;
    subtotalMinor += lineMinor;
    if (item.lineMinor !== lineMinor || item.unitMinor !== unitMinor || item.vatRate !== vatRate) {
      await prisma.storeOrderLine.update({
        where: { id: item.id },
        data: { unitMinor, lineMinor, vatRate },
      });
      changed = true;
    }
  }

  const newTotal = subtotalMinor + (order.shippingMinor ?? 0) - (order.discountMinor ?? 0);
  if (order.subtotalMinor !== subtotalMinor || order.totalMinor !== newTotal) {
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: { subtotalMinor, totalMinor: newTotal },
    });
    changed = true;
  }

  // Snapshot her zaman güncel fatura tutarıyla uyumlu olsun (eski katalog fiyatı kalıntısı).
  const fresh = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    select: { totalMinor: true, financeSnapshotJson: true },
  });
  const snap = parseOrderFinanceSnapshot(fresh?.financeSnapshotJson);
  if (fresh && (!snap || snap.grossMinor !== fresh.totalMinor)) {
    try {
      await applyOrderFinanceSnapshot(siteId, orderId);
      changed = true;
    } catch {
      /* snapshot hatası onarımı durdurmaz */
    }
  }
  return changed;
}

export async function importTrendyolPackages(
  siteId: string,
  packages: TrendyolShipmentPackage[],
): Promise<{ imported: number; skipped: number; repaired: number; productIds: string[]; message: string }> {
  let imported = 0;
  let skipped = 0;
  let repaired = 0;
  const notes: string[] = [];
  const touchedProductIds = new Set<string>();

  for (const pkg of packages) {
    const ref = marketplacePackageRef("trendyol", pkg.shipmentPackageId);
    const existing = await prisma.storeOrder.findFirst({
      where: { siteId, marketplaceRef: ref },
    });
    if (existing) {
      const didRepair = await repairExistingTrendyolOrder(siteId, existing.id, pkg);
      if (didRepair) repaired++;
      else skipped++;
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
      // Fatura tutarı Trendyol'un müşteriden tahsil ettiği net tutarla eşleşmeli.
      // Bu yüzden katalog fiyatımızı değil, Trendyol'un indirimli `price` değerini
      // esas alırız. (Katalog fiyatı yalnızca Trendyol tutarı yoksa yedek olur.)
      const qty = line.quantity > 0 ? line.quantity : 1;
      let lineMinor = trendyolLineNetMinor(line);
      if (lineMinor <= 0) {
        lineMinor = product
          ? resolveMarketplaceSalePriceMinor(product, "trendyol") * qty
          : tryMinorFromTry(line.price) * qty;
      }
      const unitMinor = Math.round(lineMinor / qty);
      orderLines.push({
        productId: product?.id ?? null,
        title: line.productName ?? product?.title ?? `Trendyol #${line.lineId}`,
        sku: line.merchantSku ?? line.barcode ?? product?.sku ?? null,
        qty: line.quantity,
        unitMinor,
        lineMinor,
        vatRate: line.vatRate != null ? Math.round(line.vatRate) : product?.vatRate ?? null,
      });
    }

    const subtotalMinor = orderLines.reduce((s, l) => s + l.lineMinor, 0);

    const lineExtras = await Promise.all(
      orderLines.map((l) => marketplaceOrderLineExtras(prisma, l.productId, l.qty)),
    );

    const localStatus = trendyolStatusToLocal(pkg.status);
    const deductStock = PRE_SHIPMENT_STATUSES.has(localStatus);
    let createShipmentMeta = buildTrendyolShipmentMeta(pkg);
    if (localStatus === "shipped" || localStatus === "delivered") {
      createShipmentMeta = withShippedAt(createShipmentMeta);
    }
    if (localStatus === "delivered") {
      createShipmentMeta = withDeliveredAt(createShipmentMeta);
    }

    const createdOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.storeOrder.create({
        data: {
          siteId,
          orderNumber: `TY-${pkg.orderNumber}-${pkg.shipmentPackageId}`,
          status: localStatus,
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
          shipmentMetaJson: createShipmentMeta,
          marketplaceRef: ref,
          marketplacePlatform: "trendyol",
          marketplaceMetaJson: JSON.stringify(meta),
          adminNotes: `Trendyol sipariş ${pkg.orderNumber} · paket ${pkg.shipmentPackageId}`,
          lines: {
            create: orderLines.map((l, i) => ({
              productId: l.productId,
              title: l.title,
              sku: l.sku,
              qty: l.qty,
              unitMinor: l.unitMinor,
              lineMinor: l.lineMinor,
              vatRate: l.vatRate,
              lineKind: lineExtras[i]?.lineKind ?? "standard",
              bundleProductId: lineExtras[i]?.bundleProductId ?? null,
              componentsSnapshotJson: lineExtras[i]?.componentsSnapshotJson ?? null,
            })),
          },
        },
      });

      if (deductStock) {
        for (const line of orderLines) {
          if (!line.productId) continue;
          touchedProductIds.add(line.productId);
          const result = await deductMarketplaceLineStock(tx, line.productId, line.qty, line.title);
          for (const pid of result.componentProductIds) touchedProductIds.add(pid);
          if (!result.ok) {
            notes.push(`${line.title}: stok yetersiz, sipariş yine de alındı`);
          }
        }
      }

      return created;
    });

    try {
      await applyOrderFinanceSnapshot(siteId, createdOrder.id);
    } catch {
      /* snapshot hatası importu durdurmaz */
    }

    const { notifyTelegramForOrderId } = await import("@/lib/email/send-order-notifications");
    await notifyTelegramForOrderId(createdOrder.id);

    imported++;
  }

  return {
    imported,
    skipped,
    repaired,
    productIds: [...touchedProductIds],
    message:
      imported || skipped || repaired
        ? `${imported} yeni sipariş, ${repaired} tutar güncellendi, ${skipped} atlandı (değişmedi)${notes.length ? ` · ${notes.slice(0, 3).join("; ")}` : ""}`
        : "Yeni sipariş yok",
  };
}
