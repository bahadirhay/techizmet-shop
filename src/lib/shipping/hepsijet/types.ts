export type HepsijetProductCode = "HX_STD" | "HX_SD" | "HX_ND" | "HX_EX";
export type HepsijetDeliveryType = "RETAIL" | "MARKET_PLACE" | "EXPRESS" | "RETURNED";

export type HepsijetCarrierConfig = {
  apiUsername: string;
  apiPassword: string;
  abbreviationCode: string;
  companyName: string;
  companyAddressId: string;
  currentXDockCode: string;
  contractNo?: string;
  testMode: boolean;
  productCode: HepsijetProductCode;
  deliveryType: HepsijetDeliveryType;
  autoMarkShipped: boolean;
};

export type HepsijetOrderShipmentMeta = {
  provider: "hepsijet";
  customerDeliveryNo: string;
  status?: string | null;
  labelPdfBase64?: string | null;
  lastError?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function parseHepsijetOrderShipmentMeta(raw: string | null | undefined): HepsijetOrderShipmentMeta | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as Partial<HepsijetOrderShipmentMeta>;
    if (o.provider !== "hepsijet" || !o.customerDeliveryNo?.trim()) return null;
    return {
      provider: "hepsijet",
      customerDeliveryNo: o.customerDeliveryNo.trim(),
      status: o.status ?? null,
      labelPdfBase64: o.labelPdfBase64 ?? null,
      lastError: o.lastError ?? null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  } catch {
    return null;
  }
}

export function serializeHepsijetOrderShipmentMeta(meta: HepsijetOrderShipmentMeta): string {
  return JSON.stringify(meta);
}
