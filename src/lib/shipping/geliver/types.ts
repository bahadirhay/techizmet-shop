export type GeliverParcelDefaults = {
  length?: string;
  width?: string;
  height?: string;
  weight?: string;
  distanceUnit?: "cm" | "in";
  massUnit?: "kg" | "lb";
};

export type GeliverSiteSettings = {
  enabled?: boolean;
  apiToken?: string;
  /** Geliver gönderici adres ID — addresses.createSender sonrası */
  senderAddressId?: string;
  testMode?: boolean;
  /** Webhook imza doğrulama (opsiyonel) */
  webhookSecret?: string;
  /** Teklif gelince en ucuz otomatik kabul */
  autoAcceptCheapestOffer?: boolean;
  /** Etiket alındıktan sonra siparişi kargoda yap + müşteri bildirimi */
  autoMarkShipped?: boolean;
  /** Varsayılan paket ölçüleri */
  parcel?: GeliverParcelDefaults;
  /** Tercih edilen kargo servisi kodu (opsiyonel) */
  providerServiceCode?: string;
};

export type GeliverOrderShipmentMeta = {
  shipmentId: string;
  transactionId?: string | null;
  statusCode?: string | null;
  trackingStatusCode?: string | null;
  trackingSubStatusCode?: string | null;
  barcode?: string | null;
  labelURL?: string | null;
  responsiveLabelURL?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  providerServiceCode?: string | null;
  providerCode?: string | null;
  offerId?: string | null;
  lastError?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function parseGeliverOrderShipmentMeta(raw: string | null | undefined): GeliverOrderShipmentMeta | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as Partial<GeliverOrderShipmentMeta>;
    if (!o.shipmentId?.trim()) return null;
    return {
      shipmentId: o.shipmentId.trim(),
      transactionId: o.transactionId ?? null,
      statusCode: o.statusCode ?? null,
      trackingStatusCode: o.trackingStatusCode ?? null,
      trackingSubStatusCode: o.trackingSubStatusCode ?? null,
      barcode: o.barcode ?? null,
      labelURL: o.labelURL ?? null,
      responsiveLabelURL: o.responsiveLabelURL ?? null,
      trackingNumber: o.trackingNumber ?? null,
      trackingUrl: o.trackingUrl ?? null,
      providerServiceCode: o.providerServiceCode ?? null,
      providerCode: o.providerCode ?? null,
      offerId: o.offerId ?? null,
      lastError: o.lastError ?? null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  } catch {
    return null;
  }
}

export function serializeGeliverOrderShipmentMeta(meta: GeliverOrderShipmentMeta): string {
  return JSON.stringify(meta);
}
