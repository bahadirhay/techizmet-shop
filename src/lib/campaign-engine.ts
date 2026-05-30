/** Kampanya türleri ve kapsam — cart + admin ortak */

export const CAMPAIGN_TYPES = [
  { id: "percent_off", label: "Yüzde indirim (%)" },
  { id: "fixed_off", label: "Tutar indirimi (TL)" },
  { id: "free_shipping", label: "Ücretsiz kargo" },
  { id: "buy_x_pay_y", label: "X al Y öde (örn. 3 al 2 öde)" },
] as const;

export type CampaignTypeId = (typeof CAMPAIGN_TYPES)[number]["id"];

export type CampaignScope = {
  categoryIds?: string[];
  collectionIds?: string[];
  productIds?: string[];
  brandIds?: string[];
};

export type PromoLineMeta = {
  lineKey: string;
  productId: string;
  variantId: string | null;
  categoryId: string | null;
  categoryIds: string[];
  collectionId: string | null;
  brandId: string | null;
  unitMinor: number;
  qty: number;
  lineMinor: number;
};

export type CampaignRecord = {
  id: string;
  name: string;
  code: string | null;
  type: string;
  percentOff: number | null;
  amountOffMinor: number | null;
  buyQuantity: number | null;
  payQuantity: number | null;
  scopeJson: string | null;
  autoApply: boolean;
  minCartMinor: number | null;
  freeShipping: boolean;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

export type CampaignApplyResult = {
  campaignId: string | null;
  discountMinor: number;
  freeShipping: boolean;
  label: string | null;
  error: string | null;
  /** lineKey → indirim payı */
  lineDiscounts: Map<string, number>;
};

export function cartLineKey(productId: string, variantId: string | null): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

export function parseCampaignScope(raw: string | null | undefined): CampaignScope | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const scope: CampaignScope = {};
    if (Array.isArray(o.categoryIds)) {
      scope.categoryIds = o.categoryIds.filter((x) => typeof x === "string");
    }
    if (Array.isArray(o.collectionIds)) {
      scope.collectionIds = o.collectionIds.filter((x) => typeof x === "string");
    }
    if (Array.isArray(o.productIds)) {
      scope.productIds = o.productIds.filter((x) => typeof x === "string");
    }
    if (Array.isArray(o.brandIds)) {
      scope.brandIds = o.brandIds.filter((x) => typeof x === "string");
    }
    const has =
      (scope.categoryIds?.length ?? 0) > 0 ||
      (scope.collectionIds?.length ?? 0) > 0 ||
      (scope.productIds?.length ?? 0) > 0 ||
      (scope.brandIds?.length ?? 0) > 0;
    return has ? scope : null;
  } catch {
    return null;
  }
}

export function serializeCampaignScope(scope: CampaignScope | null): string | null {
  if (!scope) return null;
  const has =
    (scope.categoryIds?.length ?? 0) > 0 ||
    (scope.collectionIds?.length ?? 0) > 0 ||
    (scope.productIds?.length ?? 0) > 0 ||
    (scope.brandIds?.length ?? 0) > 0;
  return has ? JSON.stringify(scope) : null;
}

export function isLineEligible(meta: PromoLineMeta, scope: CampaignScope | null): boolean {
  if (!scope) return true;
  if (scope.productIds?.length && scope.productIds.includes(meta.productId)) return true;
  if (scope.categoryIds?.length) {
    const cats = meta.categoryId ? [meta.categoryId, ...meta.categoryIds] : meta.categoryIds;
    if (cats.some((id) => scope.categoryIds!.includes(id))) return true;
  }
  if (scope.collectionIds?.length && meta.collectionId && scope.collectionIds.includes(meta.collectionId)) {
    return true;
  }
  if (scope.brandIds?.length && meta.brandId && scope.brandIds.includes(meta.brandId)) {
    return true;
  }
  const scoped =
    (scope.productIds?.length ?? 0) > 0 ||
    (scope.categoryIds?.length ?? 0) > 0 ||
    (scope.collectionIds?.length ?? 0) > 0 ||
    (scope.brandIds?.length ?? 0) > 0;
  return !scoped;
}

function emptyResult(error: string | null = null): CampaignApplyResult {
  return {
    campaignId: null,
    discountMinor: 0,
    freeShipping: false,
    label: null,
    error,
    lineDiscounts: new Map(),
  };
}

function allocateProportional(
  lines: { lineKey: string; lineMinor: number }[],
  totalDiscount: number,
): Map<string, number> {
  const out = new Map<string, number>();
  if (totalDiscount <= 0 || lines.length === 0) return out;
  const eligibleTotal = lines.reduce((s, l) => s + l.lineMinor, 0);
  if (eligibleTotal <= 0) return out;

  let allocated = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    let share: number;
    if (i === lines.length - 1) {
      share = totalDiscount - allocated;
    } else {
      share = Math.round((totalDiscount * line.lineMinor) / eligibleTotal);
      allocated += share;
    }
    if (share > 0) out.set(line.lineKey, share);
  }
  return out;
}

/** 3 al 2 öde: en ucuz birimler bedava */
export function computeBuyXPayYDiscount(
  lines: PromoLineMeta[],
  buyQty: number,
  payQty: number,
): { discountMinor: number; lineDiscounts: Map<string, number> } {
  const lineDiscounts = new Map<string, number>();
  if (buyQty < 2 || payQty < 1 || payQty >= buyQty) {
    return { discountMinor: 0, lineDiscounts };
  }

  const freePerSet = buyQty - payQty;
  const units: { lineKey: string; unitMinor: number }[] = [];
  for (const line of lines) {
    for (let i = 0; i < line.qty; i++) {
      units.push({ lineKey: line.lineKey, unitMinor: line.unitMinor });
    }
  }

  if (units.length < buyQty) {
    return { discountMinor: 0, lineDiscounts };
  }

  units.sort((a, b) => a.unitMinor - b.unitMinor);
  const completeSets = Math.floor(units.length / buyQty);
  const freeCount = completeSets * freePerSet;
  let discountMinor = 0;

  for (let i = 0; i < freeCount; i++) {
    const u = units[i]!;
    discountMinor += u.unitMinor;
    lineDiscounts.set(u.lineKey, (lineDiscounts.get(u.lineKey) ?? 0) + u.unitMinor);
  }

  return { discountMinor, lineDiscounts };
}

export function applyCampaignToCart(
  campaign: CampaignRecord,
  lines: PromoLineMeta[],
  subtotalMinor: number,
): CampaignApplyResult {
  if (campaign.minCartMinor != null && subtotalMinor < campaign.minCartMinor) {
    return emptyResult(
      `Minimum sepet tutarı: ${(campaign.minCartMinor / 100).toFixed(2)} TL`,
    );
  }

  const scope = parseCampaignScope(campaign.scopeJson);
  const eligible = lines.filter((l) => isLineEligible(l, scope));
  const eligibleSubtotal = eligible.reduce((s, l) => s + l.lineMinor, 0);

  if (scope && eligible.length === 0) {
    return emptyResult("Kampanya kapsamında ürün yok");
  }

  let discountMinor = 0;
  let lineDiscounts = new Map<string, number>();

  if (campaign.type === "percent_off" && campaign.percentOff) {
    const base = scope ? eligibleSubtotal : subtotalMinor;
    discountMinor = Math.round((base * campaign.percentOff) / 100);
    const allocLines = (scope ? eligible : lines).map((l) => ({
      lineKey: l.lineKey,
      lineMinor: l.lineMinor,
    }));
    lineDiscounts = allocateProportional(allocLines, discountMinor);
  } else if (campaign.type === "fixed_off" && campaign.amountOffMinor) {
    const base = scope ? eligibleSubtotal : subtotalMinor;
    discountMinor = Math.min(campaign.amountOffMinor, base);
    const allocLines = (scope ? eligible : lines).map((l) => ({
      lineKey: l.lineKey,
      lineMinor: l.lineMinor,
    }));
    lineDiscounts = allocateProportional(allocLines, discountMinor);
  } else if (campaign.type === "buy_x_pay_y" && campaign.buyQuantity && campaign.payQuantity) {
    const targetLines = scope ? eligible : lines;
    const result = computeBuyXPayYDiscount(
      targetLines,
      campaign.buyQuantity,
      campaign.payQuantity,
    );
    discountMinor = result.discountMinor;
    lineDiscounts = result.lineDiscounts;
    if (discountMinor === 0 && targetLines.length > 0) {
      return emptyResult(
        `Kampanya için en az ${campaign.buyQuantity} uygun ürün gerekli`,
      );
    }
  } else if (campaign.type === "free_shipping") {
    return {
      campaignId: campaign.id,
      discountMinor: 0,
      freeShipping: true,
      label: campaign.name,
      error: null,
      lineDiscounts: new Map(),
    };
  }

  const freeShipping =
    campaign.freeShipping || campaign.type === "free_shipping";

  return {
    campaignId: campaign.id,
    discountMinor,
    freeShipping,
    label: campaign.name,
    error: null,
    lineDiscounts,
  };
}

export function campaignTypeLabel(type: string): string {
  return CAMPAIGN_TYPES.find((t) => t.id === type)?.label ?? type;
}

export function summarizeCampaignDetail(c: CampaignRecord): string {
  const scope = parseCampaignScope(c.scopeJson);
  const scopeNote = scope ? " · kapsamlı" : "";

  if (c.type === "percent_off" && c.percentOff) return `%${c.percentOff}${scopeNote}`;
  if (c.type === "fixed_off" && c.amountOffMinor) {
    return `${(c.amountOffMinor / 100).toFixed(2)} TL${scopeNote}`;
  }
  if (c.type === "buy_x_pay_y" && c.buyQuantity && c.payQuantity) {
    return `${c.buyQuantity} al ${c.payQuantity} öde${scopeNote}`;
  }
  if (c.type === "free_shipping" || c.freeShipping) return "Ücretsiz kargo";
  return "—";
}
