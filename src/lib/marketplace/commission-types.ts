export const SHIPPING_MODELS = [
  { id: "marketplace_cargo", label: "Pazaryeri kargo kesintisi", hint: "Kargo bedeli hakedişten düşülür" },
  { id: "seller_cargo", label: "Satıcı kargo", hint: "Kargoyu siz ödersiniz; ayrı gider kaydı" },
  { id: "none", label: "Kargo kesintisi yok", hint: "Komisyon dışında kargo tahmini yok" },
] as const;

export type ShippingModelId = (typeof SHIPPING_MODELS)[number]["id"];

export type CommissionRuleRow = {
  id: string;
  platform: string;
  categoryId: string | null;
  categoryTitle: string | null;
  commissionPercent: number;
  shippingModel: string;
  shippingFeeMinor: number;
  notes: string | null;
};

export type ResolvedCommissionRule = {
  id: string | null;
  commissionPercent: number;
  shippingModel: ShippingModelId;
  shippingFeeMinor: number;
  source: "category" | "platform_default" | "fallback";
};

const DEFAULT_COMMISSION_PERCENT = 15;

export function shippingModelLabel(id: string): string {
  return SHIPPING_MODELS.find((m) => m.id === id)?.label ?? id;
}

export function normalizeShippingModel(raw: string | undefined | null): ShippingModelId {
  if (raw === "seller_cargo" || raw === "none") return raw;
  return "marketplace_cargo";
}

export function normalizeCommissionPercent(raw: unknown, fallback = DEFAULT_COMMISSION_PERCENT): number {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 100) return fallback;
  return Math.round(n * 100) / 100;
}

/** Brüt satış (KDV dahil kuruş) üzerinden komisyon tutarı */
export function commissionMinorFromGross(grossMinor: number, commissionPercent: number): number {
  return Math.round(grossMinor * (commissionPercent / 100));
}

/** Maliyet + hedef marj + komisyon + kargo → önerilen pazaryeri brüt fiyat (kuruş, KDV dahil). */
export function suggestMarketplacePriceMinor(input: {
  costMinor: number;
  targetMarginPercent: number;
  commissionPercent: number;
  shippingFeeMinor: number;
}): number | null {
  const { costMinor, targetMarginPercent, commissionPercent, shippingFeeMinor } = input;
  if (costMinor <= 0) return null;
  const margin = targetMarginPercent / 100;
  const commission = commissionPercent / 100;
  const divisor = 1 - commission;
  if (divisor <= 0.01) return null;
  const needAfterCommission = costMinor * (1 + margin) + shippingFeeMinor;
  return Math.max(0, Math.ceil(needAfterCommission / divisor));
}

export const DEFAULT_TARGET_MARGIN_PERCENT = 35;
