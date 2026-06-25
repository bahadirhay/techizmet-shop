export type ShippingProvider = "manual" | "hepsijet" | "geliver";

export type CarrierConfig = {
  provider: ShippingProvider;
  apiUsername?: string;
  apiPassword?: string;
  /** HepsiJet kısaltma kodu (takip no öneki) */
  abbreviationCode?: string;
  companyName?: string;
  companyAddressId?: string;
  currentXDockCode?: string;
  contractNo?: string;
  testMode?: boolean;
  productCode?: string;
  deliveryType?: string;
  autoMarkShipped?: boolean;
  /** Eski alan adı — abbreviationCode ile aynı */
  apiCustomerCode?: string;
  geliver?: boolean;
  providerCode?: string;
  providerServiceCode?: string;
};

export function parseCarrierConfig(raw: string | null | undefined): CarrierConfig {
  if (!raw?.trim()) return { provider: "manual" };
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (o.geliver === true || (typeof o.providerServiceCode === "string" && o.providerServiceCode)) {
      return {
        provider: "geliver",
        geliver: true,
        providerCode: typeof o.providerCode === "string" ? o.providerCode : undefined,
        providerServiceCode: typeof o.providerServiceCode === "string" ? o.providerServiceCode : undefined,
      };
    }
    const code = String(o.provider ?? "").toLowerCase();
    if (code === "hepsijet") {
      return {
        provider: "hepsijet",
        apiUsername: str(o.apiUsername),
        apiPassword: str(o.apiPassword),
        abbreviationCode: str(o.abbreviationCode) || str(o.apiCustomerCode),
        apiCustomerCode: str(o.apiCustomerCode) || str(o.abbreviationCode),
        companyName: str(o.companyName),
        companyAddressId: str(o.companyAddressId),
        currentXDockCode: str(o.currentXDockCode),
        contractNo: str(o.contractNo),
        testMode: o.testMode === true,
        productCode: str(o.productCode) || "HX_STD",
        deliveryType: str(o.deliveryType) || "RETAIL",
        autoMarkShipped: o.autoMarkShipped !== false,
      };
    }
    return {
      provider: "manual",
      apiUsername: str(o.apiUsername),
      apiPassword: str(o.apiPassword),
      apiCustomerCode: str(o.apiCustomerCode),
      contractNo: str(o.contractNo),
    };
  } catch {
    return { provider: "manual" };
  }
}

export function serializeCarrierConfig(cfg: CarrierConfig): string {
  return JSON.stringify(cfg);
}

export function carrierProviderLabel(provider: ShippingProvider): string {
  if (provider === "hepsijet") return "HepsiJet API";
  if (provider === "geliver") return "Geliver";
  return "Manuel";
}

function str(v: unknown): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s || undefined;
}
