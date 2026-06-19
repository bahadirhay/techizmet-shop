import "server-only";

import type { GeliverClient } from "@geliver/sdk";
import { sendOrderStatusEmailIfNeeded } from "@/lib/email/send-order-email";
import { prisma } from "@/lib/prisma";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { getSiteSettings } from "@/lib/site-settings";
import { buildGeliverRecipientFromOrder } from "@/lib/shipping/geliver/address";
import { resolveGeliverProviderFromCarrierId } from "@/lib/shipping/geliver/checkout-quotes";
import { createGeliverClient } from "@/lib/shipping/geliver/client";
import { geliverReady, resolveGeliverConfig } from "@/lib/shipping/geliver/settings";
import { mapGeliverToOrderStatus, shipmentMetaFromGeliver, shipmentMetaFromTransaction } from "@/lib/shipping/geliver/status";
import {
  parseGeliverOrderShipmentMeta,
  serializeGeliverOrderShipmentMeta,
  type GeliverOrderShipmentMeta,
} from "@/lib/shipping/geliver/types";

const GELIVER_CARRIER_CODE = "geliver";

async function ensureGeliverCarrier(siteId: string, preferredCarrierId?: string | null) {
  if (preferredCarrierId) {
    const preferred = await prisma.shippingCarrier.findFirst({
      where: { id: preferredCarrierId, siteId, active: true },
    });
    if (preferred) return preferred;
  }
  const existing = await prisma.shippingCarrier.findFirst({
    where: { siteId, code: GELIVER_CARRIER_CODE },
  });
  if (existing) return existing;
  return prisma.shippingCarrier.create({
    data: {
      siteId,
      code: GELIVER_CARRIER_CODE,
      name: "Geliver",
      active: true,
      trackingUrlTemplate: "https://app.geliver.io/tracking/{tracking}",
      notes: "Geliver kargo pazaryeri entegrasyonu",
    },
  });
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function pickOfferForProvider(
  shipment: { offers?: { cheapest?: { id?: string; providerServiceCode?: string }; list?: Array<{ id?: string; providerServiceCode?: string }> } },
  providerServiceCode?: string | null,
) {
  const code = providerServiceCode?.trim().toUpperCase();
  const list = shipment.offers?.list ?? [];
  if (code) {
    const matched =
      list.find((o) => o.providerServiceCode?.trim().toUpperCase() === code) ??
      (shipment.offers?.cheapest?.providerServiceCode?.trim().toUpperCase() === code
        ? shipment.offers.cheapest
        : null);
    if (matched?.id) return matched;
  }
  return shipment.offers?.cheapest ?? null;
}

async function waitForShipmentOffer(
  client: GeliverClient,
  shipmentId: string,
  providerServiceCode?: string | null,
  attempts = 8,
) {
  for (let i = 0; i < attempts; i += 1) {
    const shipment = (await client.shipments.get(shipmentId)) as {
      offers?: { cheapest?: { id?: string; providerServiceCode?: string }; list?: Array<{ id?: string; providerServiceCode?: string }> };
    };
    const offer = pickOfferForProvider(shipment, providerServiceCode);
    if (offer?.id) return { shipment, offer };
    await sleep(1000);
  }
  throw new Error("Geliver teklifleri henüz hazır değil — birkaç saniye sonra yenileyin");
}

async function applyShipmentToOrder(params: {
  siteId: string;
  orderId: string;
  meta: GeliverOrderShipmentMeta;
  autoMarkShipped: boolean;
}) {
  const order = await prisma.storeOrder.findFirst({
    where: { id: params.orderId, siteId: params.siteId },
  });
  if (!order) throw new Error("Sipariş bulunamadı");

  const carrier = await ensureGeliverCarrier(params.siteId, order.carrierId);
  const mappedStatus = mapGeliverToOrderStatus(params.meta);
  const nextStatus =
    params.autoMarkShipped && mappedStatus && order.status !== "delivered" && order.status !== "cancelled"
      ? mappedStatus
      : order.status;
  const trackingNumber = params.meta.trackingNumber || order.trackingNumber;

  const updated = await prisma.storeOrder.update({
    where: { id: params.orderId },
    data: {
      shipmentMetaJson: serializeGeliverOrderShipmentMeta(params.meta),
      carrierId: order.carrierId ?? carrier.id,
      trackingNumber: trackingNumber || null,
      status: nextStatus,
    },
  });

  if (nextStatus !== order.status) {
    await sendOrderStatusEmailIfNeeded(order.id, order.status, nextStatus).catch((e) =>
      console.error("[geliver] notify", e),
    );
  }

  return updated;
}

export async function createGeliverShipmentForOrder(siteId: string, orderId: string) {
  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, siteId },
    include: { lines: true },
  });
  if (!order) throw new Error("Sipariş bulunamadı");
  if (order.marketplacePlatform) {
    throw new Error("Pazaryeri siparişleri Geliver ile gönderilemez — platform panelini kullanın");
  }

  const settings = await getSiteSettings(siteId);
  const siteUrl = getPublicSiteUrl();
  const config = resolveGeliverConfig(settings, siteUrl);
  if (!geliverReady(settings, siteUrl)) {
    throw new Error("Geliver kapalı veya API token tanımlı değil — Kargo & Lojistik → Geliver Entegrasyonu");
  }
  if (!config.senderAddressId) {
    throw new Error(
      "Gönderici adres ID eksik — Geliver Entegrasyonu sayfasında «Gönderici adresi oluştur» düğmesine tıklayın",
    );
  }

  const existing = parseGeliverOrderShipmentMeta(order.shipmentMetaJson);
  if (existing?.shipmentId && existing.labelURL) {
    return { meta: existing, reused: true as const };
  }

  const client = createGeliverClient(config);
  const senderAddressID = config.senderAddressId!;
  const recipientAddress = buildGeliverRecipientFromOrder(order);
  const totalAmount = (order.totalMinor / 100).toFixed(2);
  const selectedProvider = await resolveGeliverProviderFromCarrierId(order.carrierId);
  const providerServiceCode =
    selectedProvider.providerServiceCode ?? config.providerServiceCode ?? undefined;

  const createPayload = {
    senderAddressID,
    recipientAddress,
    length: config.parcel.length,
    width: config.parcel.width,
    height: config.parcel.height,
    distanceUnit: config.parcel.distanceUnit,
    weight: config.parcel.weight,
    massUnit: config.parcel.massUnit,
    ...(providerServiceCode ? { providerServiceCode } : {}),
    order: {
      orderNumber: order.orderNumber,
      sourceIdentifier: config.storeUrl,
      totalAmount,
      totalAmountCurrency: "TRY",
    },
  };

  const created = config.testMode
    ? await client.shipments.createTest(createPayload)
    : await client.shipments.create(createPayload);

  const shipmentId = created.id;
  if (!shipmentId) throw new Error("Geliver gönderi oluşturulamadı");

  let meta = shipmentMetaFromGeliver(created as Record<string, unknown>, existing);

  if (config.autoAcceptCheapestOffer) {
    const { shipment, offer } = await waitForShipmentOffer(client, shipmentId, providerServiceCode);
    meta = shipmentMetaFromGeliver(shipment as Record<string, unknown>, meta, { offerId: offer.id });
    const tx = await client.transactions.acceptOffer(offer.id!);
    meta = shipmentMetaFromTransaction(tx as unknown as Record<string, unknown>, meta);
  }

  const updated = await applyShipmentToOrder({
    siteId,
    orderId,
    meta,
    autoMarkShipped: config.autoMarkShipped,
  });

  return { meta, order: updated, reused: false as const };
}

export async function refreshGeliverShipmentForOrder(siteId: string, orderId: string) {
  const order = await prisma.storeOrder.findFirst({ where: { id: orderId, siteId } });
  if (!order) throw new Error("Sipariş bulunamadı");
  const prev = parseGeliverOrderShipmentMeta(order.shipmentMetaJson);
  if (!prev?.shipmentId) throw new Error("Bu siparişte Geliver gönderisi yok");

  const settings = await getSiteSettings(siteId);
  const config = resolveGeliverConfig(settings);
  if (!config.apiToken) throw new Error("Geliver API token tanımlı değil");

  const client = createGeliverClient(config);
  const shipment = (await client.shipments.get(prev.shipmentId)) as Record<string, unknown>;
  const meta = shipmentMetaFromGeliver(shipment, prev);
  const updated = await applyShipmentToOrder({
    siteId,
    orderId,
    meta,
    autoMarkShipped: config.autoMarkShipped,
  });
  return { meta, order: updated };
}

export async function acceptGeliverOfferForOrder(siteId: string, orderId: string, offerId?: string) {
  const order = await prisma.storeOrder.findFirst({ where: { id: orderId, siteId } });
  if (!order) throw new Error("Sipariş bulunamadı");
  const prev = parseGeliverOrderShipmentMeta(order.shipmentMetaJson);
  if (!prev?.shipmentId) throw new Error("Önce Geliver gönderisi oluşturun");

  const settings = await getSiteSettings(siteId);
  const config = resolveGeliverConfig(settings);
  const client = createGeliverClient(config);

  let chosenOfferId = offerId?.trim();
  if (!chosenOfferId) {
    const selectedProvider = await resolveGeliverProviderFromCarrierId(order.carrierId);
    const { offer } = await waitForShipmentOffer(
      client,
      prev.shipmentId,
      selectedProvider.providerServiceCode,
    );
    chosenOfferId = offer.id;
  }
  if (!chosenOfferId) throw new Error("Kabul edilecek teklif bulunamadı");

  const tx = await client.transactions.acceptOffer(chosenOfferId);
  const meta = shipmentMetaFromTransaction(tx as unknown as Record<string, unknown>, prev);
  const updated = await applyShipmentToOrder({
    siteId,
    orderId,
    meta,
    autoMarkShipped: config.autoMarkShipped,
  });
  return { meta, order: updated };
}

export async function handleGeliverWebhookForSite(
  siteId: string,
  payload: {
    event?: string;
    data?: {
      shipmentID?: string;
      trackingNumber?: string;
      trackingUrl?: string;
      trackingStatusCode?: string;
      trackingSubStatusCode?: string;
      labelURL?: string;
      barcode?: string;
    };
  },
) {
  const shipmentId = payload.data?.shipmentID?.trim();
  if (!shipmentId) return { ok: false as const, reason: "shipmentID yok" };

  const order = await prisma.storeOrder.findFirst({
    where: { siteId, shipmentMetaJson: { contains: shipmentId } },
  });
  if (!order) return { ok: false as const, reason: "sipariş bulunamadı" };

  const prev = parseGeliverOrderShipmentMeta(order.shipmentMetaJson) ?? { shipmentId };
  const meta: GeliverOrderShipmentMeta = {
    ...prev,
    trackingNumber: payload.data?.trackingNumber ?? prev.trackingNumber,
    trackingUrl: payload.data?.trackingUrl ?? prev.trackingUrl,
    trackingStatusCode: payload.data?.trackingStatusCode ?? prev.trackingStatusCode,
    trackingSubStatusCode: payload.data?.trackingSubStatusCode ?? prev.trackingSubStatusCode,
    labelURL: payload.data?.labelURL ?? prev.labelURL,
    barcode: payload.data?.barcode ?? prev.barcode,
    updatedAt: new Date().toISOString(),
  };

  const settings = await getSiteSettings(siteId);
  const config = resolveGeliverConfig(settings);
  await applyShipmentToOrder({
    siteId,
    orderId: order.id,
    meta,
    autoMarkShipped: config.autoMarkShipped,
  });
  return { ok: true as const, orderId: order.id };
}
