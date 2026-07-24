import "server-only";

import { randomUUID } from "node:crypto";
import { parseShippingAddress } from "@/lib/admin/shipping-label";
import { sendOrderStatusEmailIfNeeded } from "@/lib/email/send-order-email";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { buildHepsijetCustomerDeliveryNo } from "@/lib/shipping/hepsijet/barcode";
import {
  hepsijetCreateShipment,
  hepsijetFetchLabelPdfBase64,
  hepsijetTrackShipment,
} from "@/lib/shipping/hepsijet/client";
import { resolveHepsijetConfigFromCarrier } from "@/lib/shipping/hepsijet/settings";
import {
  parseHepsijetOrderShipmentMeta,
  serializeHepsijetOrderShipmentMeta,
  type HepsijetOrderShipmentMeta,
} from "@/lib/shipping/hepsijet/types";

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "." };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

function normalizePhone(phone: string | null | undefined): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  throw new Error("Müşteri telefonu eksik veya geçersiz");
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function loadHepsijetCarrierForOrder(siteId: string, orderId: string) {
  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    include: { carrier: true, lines: true },
  });
  if (!order) throw new Error("Sipariş bulunamadı");
  if (order.marketplacePlatform) {
    throw new Error("Pazaryeri siparişleri HepsiJet API ile gönderilemez");
  }
  const carrier = order.carrier;
  if (!carrier) throw new Error("Siparişte kargo firması seçilmemiş");
  const cfg = resolveHepsijetConfigFromCarrier(carrier);
  if (!cfg) throw new Error("Bu kargo firması HepsiJet API ile yapılandırılmamış");
  if (!cfg.configured) throw new Error(`HepsiJet ayarları eksik: ${cfg.missing.join(", ")}`);
  return { order, carrier, cfg };
}

async function applyHepsijetToOrder(params: {
  siteId: string;
  orderId: string;
  meta: HepsijetOrderShipmentMeta;
  autoMarkShipped: boolean;
  carrierId: string;
}) {
  const order = await prisma.storeOrder.findFirst({ where: { id: params.orderId, siteId: params.siteId } });
  if (!order) throw new Error("Sipariş bulunamadı");

  const nextStatus =
    params.autoMarkShipped && order.status !== "delivered" && order.status !== "cancelled"
      ? "shipped"
      : order.status;

  const updated = await prisma.storeOrder.update({
    where: { id: params.orderId },
    data: {
      shipmentMetaJson: serializeHepsijetOrderShipmentMeta(params.meta),
      carrierId: params.carrierId,
      trackingNumber: params.meta.customerDeliveryNo,
      status: nextStatus,
    },
  });

  if (nextStatus !== order.status) {
    await sendOrderStatusEmailIfNeeded(order.id, order.status, nextStatus).catch((e) =>
      console.error("[hepsijet] notify", e),
    );
  }
  return updated;
}

export async function createHepsijetShipmentForOrder(siteId: string, orderId: string) {
  const { order, carrier, cfg } = await loadHepsijetCarrierForOrder(siteId, orderId);
  const existing = parseHepsijetOrderShipmentMeta(order.shipmentMetaJson);
  if (existing?.customerDeliveryNo && existing.labelPdfBase64) {
    return { meta: existing, reused: true as const };
  }

  const settings = await getSiteSettings(siteId);
  const shipFrom = settings.store?.shipFrom;
  if (!shipFrom?.name?.trim() || !shipFrom.line1?.trim() || !shipFrom.city?.trim() || !shipFrom.district?.trim()) {
    throw new Error("Gönderici adresi eksik — Ayarlar → Mağaza → Kargo gönderici adresi");
  }

  const addr = parseShippingAddress(order.shippingAddressJson);
  const line1 = [addr.line1, addr.line2].filter(Boolean).join(" ").trim();
  if (!order.customerName?.trim()) throw new Error("Müşteri adı eksik");
  if (!line1) throw new Error("Teslimat adresi eksik");
  if (!addr.city?.trim()) throw new Error("Şehir bilgisi eksik");
  if (!addr.district?.trim()) throw new Error("İlçe bilgisi eksik");

  const customerDeliveryNo =
    existing?.customerDeliveryNo ??
    buildHepsijetCustomerDeliveryNo(cfg.abbreviationCode, order.orderNumber);

  const productIds = order.lines.map((l) => l.productId).filter((id): id is string => Boolean(id));
  const products = await prisma.storeProduct.findMany({
    where: { id: { in: productIds } },
    select: { desi: true },
  });
  const desi = Math.max(1, products.reduce((s, p) => s + (p.desi ?? 1), 0));

  const receiver = splitName(order.customerName);
  const created = await hepsijetCreateShipment(cfg, {
    customerDeliveryNo,
    customerOrderId: order.orderNumber,
    desi,
    deliveryDate: todayIsoDate(),
    receiver: {
      ...receiver,
      phone: normalizePhone(order.customerPhone),
      email: order.customerEmail ?? undefined,
    },
    recipientAddress: {
      companyAddressId: randomUUID(),
      addressLine1: line1,
      city: addr.city.trim(),
      town: addr.district.trim(),
      district: addr.district.trim(),
    },
    senderAddress: {
      companyAddressId: cfg.companyAddressId,
      addressLine1: shipFrom.line1.trim(),
      city: shipFrom.city.trim(),
      town: shipFrom.district.trim(),
      district: shipFrom.district.trim(),
    },
  });

  let labelPdfBase64: string | null = existing?.labelPdfBase64 ?? null;
  try {
    labelPdfBase64 = await hepsijetFetchLabelPdfBase64(cfg, [created.customerDeliveryNo]);
  } catch (e) {
    console.error("[hepsijet] label", e);
  }

  const meta: HepsijetOrderShipmentMeta = {
    provider: "hepsijet",
    customerDeliveryNo: created.customerDeliveryNo,
    status: created.status ?? null,
    labelPdfBase64,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updated = await applyHepsijetToOrder({
    siteId,
    orderId,
    meta,
    autoMarkShipped: cfg.autoMarkShipped,
    carrierId: carrier.id,
  });

  return { meta, order: updated, reused: false as const };
}

export async function refreshHepsijetShipmentForOrder(siteId: string, orderId: string) {
  const { order, carrier, cfg } = await loadHepsijetCarrierForOrder(siteId, orderId);
  const prev = parseHepsijetOrderShipmentMeta(order.shipmentMetaJson);
  if (!prev?.customerDeliveryNo) throw new Error("Bu siparişte HepsiJet gönderisi yok");

  const status = await hepsijetTrackShipment(cfg, prev.customerDeliveryNo);
  const meta: HepsijetOrderShipmentMeta = {
    ...prev,
    status: status ?? prev.status ?? null,
    updatedAt: new Date().toISOString(),
  };

  const updated = await applyHepsijetToOrder({
    siteId,
    orderId,
    meta,
    autoMarkShipped: false,
    carrierId: carrier.id,
  });
  return { meta, order: updated };
}

export async function fetchHepsijetLabelForOrder(siteId: string, orderId: string) {
  const { order, carrier, cfg } = await loadHepsijetCarrierForOrder(siteId, orderId);
  const prev = parseHepsijetOrderShipmentMeta(order.shipmentMetaJson);
  if (!prev?.customerDeliveryNo) throw new Error("Önce HepsiJet gönderisi oluşturun");

  const labelPdfBase64 = await hepsijetFetchLabelPdfBase64(cfg, [prev.customerDeliveryNo]);
  const meta: HepsijetOrderShipmentMeta = {
    ...prev,
    labelPdfBase64,
    updatedAt: new Date().toISOString(),
  };
  const updated = await applyHepsijetToOrder({
    siteId,
    orderId,
    meta,
    autoMarkShipped: false,
    carrierId: carrier.id,
  });
  return { meta, order: updated };
}
