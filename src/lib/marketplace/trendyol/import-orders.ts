import { prisma } from "@/lib/prisma";
import { resolveMarketplaceSalePriceMinor } from "@/lib/marketplace/product-prices";
import {
  applyOrderFinanceSnapshot,
  parseOrderFinanceSnapshot,
} from "@/lib/finance/order-economics";
import {
  findProductByBarcodeOrSku,
  marketplaceOrderLineExtras,
  recordMarketplaceOrderStock,
} from "@/lib/marketplace/import-helpers";
import { marketplacePackageRef, type MarketplaceOrderMeta } from "@/lib/marketplace/types";
import type { TrendyolShipmentPackage } from "@/lib/marketplace/trendyol/orders";
import { withDeliveredAt, withShippedAt } from "@/lib/orders/shipment-meta";
import { isOrderStockRestoreStatus, applyOrderStockRestoreOnStatusChange } from "@/lib/stock/order-stock";

function tryMinorFromTry(amount: number | undefined, fallback = 0): number {
  if (amount == null || !Number.isFinite(amount)) return fallback;
  return Math.round(amount * 100);
}

/**
 * Trendyol satırının faturalanacak net tutarı (KDV dâhil, kuruş).
 * `price` / `lineUnitPrice` = indirim sonrası birim = panel "Faturalanacak Tutar".
 * Yoksa liste (amount/lineGrossAmount) − satıcı − TY indirimi (birim × adet).
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
    // discount / tyDiscount birim bazlıdır (API lineSellerDiscount / lineTyDiscount)
    const unitNet = Math.max(0, line.amount - (line.discount ?? 0) - (line.tyDiscount ?? 0));
    return Math.round(unitNet * qty * 100);
  }
  return 0;
}

/** Satır satıcı indirimi toplamı (kuruş). */
function trendyolLineSellerDiscountMinor(line: {
  quantity: number;
  amount?: number;
  discount?: number;
  price?: number;
  tyDiscount?: number;
}): number {
  const qty = line.quantity > 0 ? line.quantity : 1;
  if (line.discount != null && Number.isFinite(line.discount) && line.discount > 0) {
    return Math.round(line.discount * qty * 100);
  }
  // İndirim alanı yoksa liste − (fatura + TY) farkından satıcı payını çıkar
  if (
    line.amount != null &&
    line.price != null &&
    Number.isFinite(line.amount) &&
    Number.isFinite(line.price) &&
    line.amount > line.price
  ) {
    const unitSeller = Math.max(0, line.amount - line.price - (line.tyDiscount ?? 0));
    return Math.round(unitSeller * qty * 100);
  }
  return 0;
}

/** Trendyol sevkiyat paketi durumu → yerel sipariş durumu. */
function trendyolStatusToLocal(
  tyStatus: string | undefined,
  opts?: { hasTracking?: boolean },
): string {
  switch (tyStatus) {
    case "Created":
    case "UnPacked":
      return "pending";
    case "Picking":
    case "Invoiced":
      // Trendyol sıkça Picking/Invoiced iken takip no üretir; kargo/fatura kuyruğuna düşsün.
      return opts?.hasTracking ? "shipped" : "confirmed";
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
  const hasTracking = Boolean(pkg.cargoTrackingNumber?.trim());
  const localStatus = trendyolStatusToLocal(pkg.status, { hasTracking });
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
    meta.packageGrossAmount = pkg.packageGrossAmount ?? null;
    meta.packageSellerDiscount = pkg.packageSellerDiscount ?? null;
    meta.packageTyDiscount = pkg.packageTyDiscount ?? null;
    meta.packageTotalPrice = pkg.packageTotalPrice ?? null;
    meta.lines = pkg.lines.map((l) => ({
      lineId: l.lineId,
      quantity: l.quantity,
      barcode: l.barcode,
      merchantSku: l.merchantSku,
      listUnit: l.amount ?? null,
      netUnit: l.price ?? null,
      sellerDiscountUnit: l.discount ?? null,
      tyDiscountUnit: l.tyDiscount ?? null,
    }));
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

    // İptal / iade → stok iadesi (hareket defteri + ürün stoğu)
    if (isOrderStockRestoreStatus(localStatus)) {
      try {
        const { restored } = await prisma.$transaction(async (tx) => {
          return applyOrderStockRestoreOnStatusChange(tx, {
            siteId,
            orderId: order.id,
            previousStatus: order.status,
            nextStatus: localStatus,
          });
        });
        if (restored > 0) changed = true;
      } catch (e) {
        console.error("[trendyol] stock restore", e);
      }
    }
  } else if (isOrderStockRestoreStatus(localStatus)) {
    // Durum zaten iptal/iade — eksik stok iadesini tamamla
    try {
      await prisma.$transaction(async (tx) => {
        await applyOrderStockRestoreOnStatusChange(tx, {
          siteId,
          orderId: order.id,
          previousStatus: order.status,
          nextStatus: localStatus,
        });
      });
    } catch {
      /* idempotent */
    }
  }

  // Fatura kesilmişse tutarlara dokunma (durum/kargo yukarıda güncellendi).
  if (order.invoiceStatus && ["signed", "marketplace_sent"].includes(order.invoiceStatus)) {
    return changed;
  }
  // Satır sayıları eşleşmiyorsa güvenli tarafta kal (eşleştirme belirsiz).
  if (order.lines.length !== pkg.lines.length) return changed;

  let subtotalMinor = 0;
  let sellerDiscountMinor = 0;
  const repairedLines: { id: string; lineMinor: number; unitMinor: number; discountMinor: number; vatRate: number | null }[] = [];
  for (let i = 0; i < pkg.lines.length; i++) {
    const tl = pkg.lines[i]!;
    const item = order.lines[i]!;
    const qty = tl.quantity > 0 ? tl.quantity : item.qty || 1;
    let lineMinor = trendyolLineNetMinor(tl);
    if (lineMinor <= 0) {
      subtotalMinor += item.lineMinor;
      sellerDiscountMinor += item.discountMinor ?? 0;
      continue;
    }
    const unitMinor = Math.round(lineMinor / qty);
    const discountMinor = trendyolLineSellerDiscountMinor(tl);
    const vatRate = tl.vatRate != null ? Math.round(tl.vatRate) : item.vatRate ?? null;
    subtotalMinor += lineMinor;
    sellerDiscountMinor += discountMinor;
    repairedLines.push({ id: item.id, lineMinor, unitMinor, discountMinor, vatRate });
  }

  const packageTotalMinor =
    pkg.packageTotalPrice != null && Number.isFinite(pkg.packageTotalPrice)
      ? Math.round(pkg.packageTotalPrice * 100)
      : 0;
  if (packageTotalMinor > 0 && repairedLines.length === 1) {
    const only = repairedLines[0]!;
    const delta = packageTotalMinor - only.lineMinor;
    only.lineMinor = packageTotalMinor;
    only.unitMinor = Math.round(packageTotalMinor / Math.max(1, pkg.lines[0]?.quantity || 1));
    subtotalMinor = packageTotalMinor;
    if (delta !== 0) {
      /* pakete kilitlendi */
    }
  } else if (packageTotalMinor > 0 && repairedLines.length > 0 && Math.abs(subtotalMinor - packageTotalMinor) <= 2) {
    const last = repairedLines[repairedLines.length - 1]!;
    last.lineMinor += packageTotalMinor - subtotalMinor;
    subtotalMinor = packageTotalMinor;
  }

  for (let i = 0; i < repairedLines.length; i++) {
    const next = repairedLines[i]!;
    const item = order.lines[i]!;
    if (
      item.lineMinor !== next.lineMinor ||
      item.unitMinor !== next.unitMinor ||
      item.vatRate !== next.vatRate ||
      (item.discountMinor ?? 0) !== next.discountMinor
    ) {
      await prisma.storeOrderLine.update({
        where: { id: next.id },
        data: {
          unitMinor: next.unitMinor,
          lineMinor: next.lineMinor,
          discountMinor: next.discountMinor,
          vatRate: next.vatRate,
        },
      });
      changed = true;
    }
  }

  // Faturalanacak tutar = satır netleri; satıcı indirimi ayrı alanda tutulur (çift düşülmez)
  const newTotal = subtotalMinor + (order.shippingMinor ?? 0);
  if (
    order.subtotalMinor !== subtotalMinor ||
    order.totalMinor !== newTotal ||
    (order.discountMinor ?? 0) !== sellerDiscountMinor
  ) {
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        subtotalMinor,
        totalMinor: newTotal,
        discountMinor: sellerDiscountMinor,
      },
    });
    changed = true;
  }

  // Snapshot: fatura tutarı + indirim alanı güncel kalsın (eski katalog / discountMinor=0 kalıntısı).
  const fresh = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    select: {
      totalMinor: true,
      discountMinor: true,
      subtotalMinor: true,
      financeSnapshotJson: true,
    },
  });
  const snap = parseOrderFinanceSnapshot(fresh?.financeSnapshotJson);
  if (
    fresh &&
    (!snap ||
      snap.grossMinor !== fresh.totalMinor ||
      (snap.discountMinor ?? 0) !== (fresh.discountMinor ?? 0))
  ) {
    try {
      await applyOrderFinanceSnapshot(siteId, orderId);
      changed = true;
    } catch {
      // Tam rebuild başarısızsa (ör. cache dışı CLI) en azından brüt/indirim alanlarını yaz.
      if (snap) {
        try {
          await prisma.storeOrder.update({
            where: { id: orderId },
            data: {
              financeSnapshotJson: JSON.stringify({
                ...snap,
                grossMinor: fresh.totalMinor,
                subtotalMinor: fresh.subtotalMinor,
                discountMinor: fresh.discountMinor ?? 0,
              }),
            },
          });
          changed = true;
        } catch {
          /* snapshot yama da başarısız olabilir */
        }
      }
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
    try {
      const result = await importOneTrendyolPackage(siteId, pkg, notes, touchedProductIds);
      if (result === "imported") imported++;
      else if (result === "repaired") repaired++;
      else skipped++;
    } catch (e) {
      const detail = e instanceof Error ? e.message : "bilinmeyen hata";
      notes.push(`#${pkg.orderNumber}: ${detail.slice(0, 160)}`);
    }
  }

  const errorCount = notes.filter((n) => n.startsWith("#")).length;

  return {
    imported,
    skipped,
    repaired,
    productIds: [...touchedProductIds],
    message:
      imported || skipped || repaired || errorCount
        ? `${imported} yeni sipariş, ${repaired} tutar güncellendi, ${skipped} atlandı (değişmedi)${
            errorCount ? `, ${errorCount} hata` : ""
          }${notes.length ? ` · ${notes.slice(0, 3).join("; ")}` : ""}`
        : "Yeni sipariş yok",
  };
}

async function importOneTrendyolPackage(
  siteId: string,
  pkg: TrendyolShipmentPackage,
  notes: string[],
  touchedProductIds: Set<string>,
): Promise<"imported" | "repaired" | "skipped"> {
    const ref = marketplacePackageRef("trendyol", pkg.shipmentPackageId);
    const existing = await prisma.storeOrder.findFirst({
      where: { siteId, marketplaceRef: ref },
    });
    if (existing) {
      const didRepair = await repairExistingTrendyolOrder(siteId, existing.id, pkg);
      return didRepair ? "repaired" : "skipped";
    }

    const meta: MarketplaceOrderMeta = {
      shipmentPackageId: pkg.shipmentPackageId,
      orderNumber: pkg.orderNumber,
      tyStatus: pkg.status,
      packageGrossAmount: pkg.packageGrossAmount ?? null,
      packageSellerDiscount: pkg.packageSellerDiscount ?? null,
      packageTyDiscount: pkg.packageTyDiscount ?? null,
      packageTotalPrice: pkg.packageTotalPrice ?? null,
      lines: pkg.lines.map((l) => ({
        lineId: l.lineId,
        quantity: l.quantity,
        barcode: l.barcode,
        merchantSku: l.merchantSku,
        listUnit: l.amount ?? null,
        netUnit: l.price ?? null,
        sellerDiscountUnit: l.discount ?? null,
        tyDiscountUnit: l.tyDiscount ?? null,
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
      discountMinor: number;
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
      // Paket seviyesi fatura tutarı varsa satırları ona göre hizala (yuvarlama farkı)
      const unitMinor = Math.round(lineMinor / qty);
      const discountMinor = trendyolLineSellerDiscountMinor(line);
      orderLines.push({
        productId: product?.id ?? null,
        title: line.productName ?? product?.title ?? `Trendyol #${line.lineId}`,
        sku: line.merchantSku ?? line.barcode ?? product?.sku ?? null,
        qty: line.quantity,
        unitMinor,
        lineMinor,
        discountMinor,
        vatRate: line.vatRate != null ? Math.round(line.vatRate) : product?.vatRate ?? null,
      });
    }

    let subtotalMinor = orderLines.reduce((s, l) => s + l.lineMinor, 0);
    const packageTotalMinor =
      pkg.packageTotalPrice != null && Number.isFinite(pkg.packageTotalPrice)
        ? Math.round(pkg.packageTotalPrice * 100)
        : 0;
    // Tek satırlı paketlerde fatura tutarını paket neti ile kilitle
    if (packageTotalMinor > 0 && orderLines.length === 1) {
      orderLines[0]!.lineMinor = packageTotalMinor;
      orderLines[0]!.unitMinor = Math.round(
        packageTotalMinor / Math.max(1, orderLines[0]!.qty),
      );
      subtotalMinor = packageTotalMinor;
    } else if (packageTotalMinor > 0 && Math.abs(subtotalMinor - packageTotalMinor) <= 2) {
      // Kuruş yuvarlama: pakete hizala
      const delta = packageTotalMinor - subtotalMinor;
      orderLines[orderLines.length - 1]!.lineMinor += delta;
      subtotalMinor = packageTotalMinor;
    }
    const discountMinor = orderLines.reduce((s, l) => s + l.discountMinor, 0);

    const lineExtras = await Promise.all(
      orderLines.map((l) => marketplaceOrderLineExtras(prisma, l.productId, l.qty)),
    );

    const hasTracking = Boolean(pkg.cargoTrackingNumber?.trim());
    const localStatus = trendyolStatusToLocal(pkg.status, { hasTracking });
    // İptal/iade hariç tüm yeni siparişlerde stok düş (shipped/delivered dahil —
    // geçmiş paketler PRE_SHIPMENT filtresi yüzünden hiç düşülmüyordu).
    const deductStock = !isOrderStockRestoreStatus(localStatus);
    let createShipmentMeta = buildTrendyolShipmentMeta(pkg);
    if (localStatus === "shipped" || localStatus === "delivered") {
      createShipmentMeta = withShippedAt(createShipmentMeta);
    }
    if (localStatus === "delivered") {
      createShipmentMeta = withDeliveredAt(createShipmentMeta);
    }

    const createdOrder = await prisma.$transaction(
      async (tx) => {
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
          discountMinor,
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
              discountMinor: l.discountMinor,
              vatRate: l.vatRate,
              lineKind: lineExtras[i]?.lineKind ?? "standard",
              bundleProductId: lineExtras[i]?.bundleProductId ?? null,
              componentsSnapshotJson: lineExtras[i]?.componentsSnapshotJson ?? null,
            })),
          },
        },
        include: { lines: true },
      });

      if (deductStock) {
        const stock = await recordMarketplaceOrderStock(tx, {
          siteId,
          orderId: created.id,
          lines: created.lines.map((l) => ({
            id: l.id,
            productId: l.productId,
            variantId: l.variantId,
            qty: l.qty,
            title: l.title,
          })),
        });
        for (const pid of stock.productIds) touchedProductIds.add(pid);
        for (const w of stock.warnings) notes.push(w);
      }

      return created;
    },
      { maxWait: 15_000, timeout: 60_000 },
    );

    try {
      await applyOrderFinanceSnapshot(siteId, createdOrder.id);
    } catch {
      /* snapshot hatası importu durdurmaz */
    }

    const { notifyTelegramForOrderId } = await import("@/lib/email/send-order-notifications");
    await notifyTelegramForOrderId(createdOrder.id);

    return "imported";
}
