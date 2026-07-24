import type { CarrierFormData, RateRow } from "@/components/admin/ShippingCarrierForm";
import { parseCarrierConfig, type ShippingProvider } from "@/lib/shipping/carrier-config";
import { minorToTry } from "@/lib/admin/money";

type CarrierRow = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  trackingUrlTemplate: string | null;
  customerServicePhone: string | null;
  notes: string | null;
  configJson: string | null;
  sortOrder: number;
  rates?: {
    id: string;
    name: string;
    priceMinor: number;
    freeOverMinor: number | null;
    minDesi: number | null;
    maxDesi: number | null;
  }[];
};

export function emptyCarrierForm(preset?: {
  code: string;
  name: string;
  trackingUrlTemplate: string;
  provider?: ShippingProvider;
}): CarrierFormData {
  const isHepsijet = preset?.provider === "hepsijet" || preset?.code === "hepsijet";
  return {
    code: preset?.code ?? "",
    name: preset?.name ?? "",
    active: true,
    trackingUrlTemplate: preset?.trackingUrlTemplate ?? "",
    customerServicePhone: "",
    notes: "",
    provider: preset?.provider ?? "manual",
    // Şifre admin'den girilir — koda gömülmez.
    apiUsername: isHepsijet ? "techizmet_integration" : "",
    apiPassword: "",
    apiCustomerCode: isHepsijet ? "TECHİZMET" : "",
    abbreviationCode: isHepsijet ? "TECHİZMET" : "",
    companyName: isHepsijet ? "TECHİZMET BİLİŞİM HİZMETL" : "",
    companyAddressId: isHepsijet ? "tech-techizmet-639" : "",
    currentXDockCode: isHepsijet ? "TECHIZMETBAKIRKOY" : "",
    contractNo: "",
    testMode: isHepsijet,
    productCode: "HX_STD",
    deliveryType: "RETAIL",
    autoMarkShipped: true,
    passwordConfigured: false,
    sortOrder: "0",
  };
}

export function carrierToForm(c: CarrierRow): CarrierFormData {
  const cfg = parseCarrierConfig(c.configJson);
  const passwordConfigured = Boolean(cfg.apiPassword);
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    active: c.active,
    trackingUrlTemplate: c.trackingUrlTemplate ?? "",
    customerServicePhone: c.customerServicePhone ?? "",
    notes: c.notes ?? "",
    provider: cfg.provider === "geliver" ? "manual" : cfg.provider,
    apiUsername: cfg.apiUsername ?? "",
    apiPassword: "",
    apiCustomerCode: cfg.apiCustomerCode ?? cfg.abbreviationCode ?? "",
    abbreviationCode: cfg.abbreviationCode ?? cfg.apiCustomerCode ?? "",
    companyName: cfg.companyName ?? "",
    companyAddressId: cfg.companyAddressId ?? "",
    currentXDockCode: cfg.currentXDockCode ?? "",
    contractNo: cfg.contractNo ?? "",
    testMode: cfg.testMode === true,
    productCode: cfg.productCode ?? "HX_STD",
    deliveryType: cfg.deliveryType ?? "RETAIL",
    autoMarkShipped: cfg.autoMarkShipped !== false,
    passwordConfigured,
    sortOrder: String(c.sortOrder),
  };
}

export function ratesToForm(rates: CarrierRow["rates"]): RateRow[] {
  return (rates ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    price: minorToTry(r.priceMinor),
    freeOver: r.freeOverMinor ? minorToTry(r.freeOverMinor) : "",
    minDesi: r.minDesi != null ? String(r.minDesi) : "",
    maxDesi: r.maxDesi != null ? String(r.maxDesi) : "",
  }));
}

export function buildCarrierConfigPayload(form: CarrierFormData): Record<string, unknown> {
  if (form.provider === "hepsijet") {
    const payload: Record<string, unknown> = {
      provider: "hepsijet",
      apiUsername: form.apiUsername.trim(),
      abbreviationCode: (form.abbreviationCode || form.apiCustomerCode).trim().toUpperCase(),
      apiCustomerCode: (form.abbreviationCode || form.apiCustomerCode).trim().toUpperCase(),
      companyName: form.companyName.trim(),
      companyAddressId: form.companyAddressId.trim(),
      currentXDockCode: form.currentXDockCode.trim(),
      contractNo: form.contractNo.trim() || undefined,
      testMode: form.testMode,
      productCode: form.productCode,
      deliveryType: form.deliveryType,
      autoMarkShipped: form.autoMarkShipped,
    };
    if (form.apiPassword.trim()) payload.apiPassword = form.apiPassword.trim();
    return payload;
  }
  const payload: Record<string, unknown> = {
    provider: "manual",
    apiUsername: form.apiUsername.trim() || undefined,
    apiCustomerCode: form.apiCustomerCode.trim() || undefined,
    contractNo: form.contractNo.trim() || undefined,
  };
  if (form.apiPassword.trim()) payload.apiPassword = form.apiPassword.trim();
  return payload;
}
