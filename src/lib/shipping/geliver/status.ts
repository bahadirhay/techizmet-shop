import "server-only";

import type { GeliverOrderShipmentMeta } from "@/lib/shipping/geliver/types";

type GeliverShipmentLike = {
  id?: string;
  statusCode?: string;
  barcode?: string;
  labelURL?: string;
  responsiveLabelURL?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  providerServiceCode?: string;
  providerCode?: string;
  trackingStatus?: {
    trackingStatusCode?: string;
    trackingSubStatusCode?: string;
  };
  offers?: {
    cheapest?: { id?: string };
  };
};

type GeliverTransactionLike = {
  id?: string;
  shipment?: GeliverShipmentLike;
};

export function shipmentMetaFromGeliver(
  shipment: GeliverShipmentLike,
  prev?: GeliverOrderShipmentMeta | null,
  extra?: Partial<GeliverOrderShipmentMeta>,
): GeliverOrderShipmentMeta {
  const now = new Date().toISOString();
  return {
    shipmentId: shipment.id ?? prev?.shipmentId ?? "",
    transactionId: extra?.transactionId ?? prev?.transactionId ?? null,
    statusCode: shipment.statusCode ?? prev?.statusCode ?? null,
    trackingStatusCode:
      shipment.trackingStatus?.trackingStatusCode ?? prev?.trackingStatusCode ?? null,
    trackingSubStatusCode:
      shipment.trackingStatus?.trackingSubStatusCode ?? prev?.trackingSubStatusCode ?? null,
    barcode: shipment.barcode ?? prev?.barcode ?? null,
    labelURL: shipment.labelURL ?? prev?.labelURL ?? null,
    responsiveLabelURL: shipment.responsiveLabelURL ?? prev?.responsiveLabelURL ?? null,
    trackingNumber: shipment.trackingNumber ?? prev?.trackingNumber ?? null,
    trackingUrl: shipment.trackingUrl ?? prev?.trackingUrl ?? null,
    providerServiceCode: shipment.providerServiceCode ?? prev?.providerServiceCode ?? null,
    providerCode: shipment.providerCode ?? prev?.providerCode ?? null,
    offerId: extra?.offerId ?? shipment.offers?.cheapest?.id ?? prev?.offerId ?? null,
    lastError: extra?.lastError ?? null,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
}

export function shipmentMetaFromTransaction(
  tx: GeliverTransactionLike,
  prev?: GeliverOrderShipmentMeta | null,
): GeliverOrderShipmentMeta {
  const shipment = tx.shipment ?? {};
  return shipmentMetaFromGeliver(shipment, prev, { transactionId: tx.id ?? null });
}

export function mapGeliverToOrderStatus(meta: GeliverOrderShipmentMeta): "shipped" | "delivered" | null {
  const code = (meta.trackingStatusCode || meta.statusCode || "").toUpperCase();
  if (code.includes("DELIVERED")) return "delivered";
  if (
    code.includes("SHIPPED") ||
    code.includes("LABEL_PRINTED") ||
    code.includes("TRACKING_CODE") ||
    code.includes("OFFER_ACCEPTED")
  ) {
    return "shipped";
  }
  return null;
}
