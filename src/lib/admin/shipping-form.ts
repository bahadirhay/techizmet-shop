import type { CarrierFormData, RateRow } from "@/components/admin/ShippingCarrierForm";
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

function parseConfig(raw: string | null) {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function emptyCarrierForm(preset?: {
  code: string;
  name: string;
  trackingUrlTemplate: string;
}): CarrierFormData {
  return {
    code: preset?.code ?? "",
    name: preset?.name ?? "",
    active: true,
    trackingUrlTemplate: preset?.trackingUrlTemplate ?? "",
    customerServicePhone: "",
    notes: "",
    apiUsername: "",
    apiPassword: "",
    apiCustomerCode: "",
    contractNo: "",
    sortOrder: "0",
  };
}

export function carrierToForm(c: CarrierRow): CarrierFormData {
  const cfg = parseConfig(c.configJson);
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    active: c.active,
    trackingUrlTemplate: c.trackingUrlTemplate ?? "",
    customerServicePhone: c.customerServicePhone ?? "",
    notes: c.notes ?? "",
    apiUsername: cfg.apiUsername ?? "",
    apiPassword: cfg.apiPassword ?? "",
    apiCustomerCode: cfg.apiCustomerCode ?? "",
    contractNo: cfg.contractNo ?? "",
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
