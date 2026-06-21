/** Kampanya türleri ve kapsam — cart + admin ortak */

export const CAMPAIGN_TYPES = [
  { id: "percent_off", label: "Yüzde indirim (%)" },
  { id: "fixed_off", label: "Tutar indirimi (TL)" },
  { id: "free_shipping", label: "Ücretsiz kargo" },
  { id: "buy_x_pay_y", label: "X al Y öde (örn. 3 al 2 öde)" },
  { id: "second_item_percent_off", label: "2. üründe indirim (%)" },
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
  firstOrderOnly: boolean;
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
  campaignIds: string[];
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
    campaignIds: [],
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

/** 2+ üründe en ucuz birim(ler)de indirim — örn. 2. üründe %50 */
export function computeSecondItemPercentOff(
  lines: PromoLineMeta[],
  percentOff: number,
  scope: CampaignScope | null,
): { discountMinor: number; lineDiscounts: Map<string, number> } {
  const lineDiscounts = new Map<string, number>();
  if (percentOff <= 0 || percentOff > 100) {
    return { discountMinor: 0, lineDiscounts };
  }

  const eligible = lines.filter((l) => isLineEligible(l, scope));
  const units: { lineKey: string; unitMinor: number }[] = [];
  for (const line of eligible) {
    for (let i = 0; i < line.qty; i++) {
      units.push({ lineKey: line.lineKey, unitMinor: line.unitMinor });
    }
  }

  if (units.length < 2) {
    return { discountMinor: 0, lineDiscounts };
  }

  units.sort((a, b) => a.unitMinor - b.unitMinor);
  const discountedUnitCount = Math.floor(units.length / 2);
  let discountMinor = 0;

  for (let i = 0; i < discountedUnitCount; i++) {
    const u = units[i]!;
    const share = Math.round((u.unitMinor * percentOff) / 100);
    if (share <= 0) continue;
    discountMinor += share;
    lineDiscounts.set(u.lineKey, (lineDiscounts.get(u.lineKey) ?? 0) + share);
  }

  return { discountMinor, lineDiscounts };
}

function mergeLineDiscounts(into: Map<string, number>, add: Map<string, number>) {
  for (const [key, val] of add) {
    if (val > 0) into.set(key, (into.get(key) ?? 0) + val);
  }
}

function sumLineDiscounts(map: Map<string, number>): number {
  let s = 0;
  for (const v of map.values()) s += v;
  return s;
}

function pickBestPercentCampaign(
  campaigns: CampaignRecord[],
  subtotalMinor: number,
): CampaignRecord | null {
  const qualifying = campaigns
    .filter((c) => c.type === "percent_off" && c.percentOff)
    .filter((c) => c.minCartMinor == null || subtotalMinor >= c.minCartMinor)
    .sort((a, b) => (b.minCartMinor ?? 0) - (a.minCartMinor ?? 0));
  return qualifying[0] ?? null;
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
  } else if (campaign.type === "second_item_percent_off" && campaign.percentOff) {
    const targetLines = scope ? eligible : lines;
    const result = computeSecondItemPercentOff(targetLines, campaign.percentOff, scope);
    discountMinor = result.discountMinor;
    lineDiscounts = result.lineDiscounts;
    if (discountMinor === 0) {
      return emptyResult("Kampanya için sepette en az 2 uygun ürün gerekli");
    }
  } else if (campaign.type === "free_shipping") {
    return {
      campaignId: campaign.id,
      campaignIds: [campaign.id],
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
    campaignIds: [campaign.id],
    discountMinor,
    freeShipping,
    label: campaign.name,
    error: null,
    lineDiscounts,
  };
}

/** Birden fazla otomatik kampanyayı birleştir (2. ürün + kademeli sepet % vb.) */
export function applyAutoCampaignsToCart(
  campaigns: CampaignRecord[],
  lines: PromoLineMeta[],
  subtotalMinor: number,
): CampaignApplyResult {
  if (!campaigns.length) return emptyResult();

  const lineDiscounts = new Map<string, number>();
  const appliedIds: string[] = [];
  const labels: string[] = [];
  let freeShipping = false;

  for (const campaign of campaigns.filter((c) => c.type === "second_item_percent_off")) {
    const scope = parseCampaignScope(campaign.scopeJson);
    const result = computeSecondItemPercentOff(lines, campaign.percentOff ?? 0, scope);
    if (result.discountMinor > 0) {
      mergeLineDiscounts(lineDiscounts, result.lineDiscounts);
      appliedIds.push(campaign.id);
      labels.push(campaign.name);
      if (campaign.freeShipping) freeShipping = true;
    }
  }

  const lineDiscountTotal = sumLineDiscounts(lineDiscounts);
  const percentBase = Math.max(0, subtotalMinor - lineDiscountTotal);
  const percentCampaign = pickBestPercentCampaign(campaigns, subtotalMinor);

  let cartDiscountMinor = lineDiscountTotal;

  if (percentCampaign?.percentOff) {
    const scope = parseCampaignScope(percentCampaign.scopeJson);
    const eligible = lines.filter((l) => isLineEligible(l, scope));
    const eligibleSubtotal = eligible.reduce((s, l) => s + l.lineMinor, 0);
    const base = scope ? eligibleSubtotal - sumLineDiscounts(lineDiscounts) : percentBase;
    if (base > 0) {
      const pctDisc = Math.round((Math.max(0, base) * percentCampaign.percentOff) / 100);
      if (pctDisc > 0) {
        cartDiscountMinor += pctDisc;
        const allocLines = (scope ? eligible : lines).map((l) => ({
          lineKey: l.lineKey,
          lineMinor: Math.max(0, l.lineMinor - (lineDiscounts.get(l.lineKey) ?? 0)),
        }));
        mergeLineDiscounts(lineDiscounts, allocateProportional(allocLines, pctDisc));
        appliedIds.push(percentCampaign.id);
        labels.push(percentCampaign.name);
        if (percentCampaign.freeShipping) freeShipping = true;
      }
    }
  }

  for (const campaign of campaigns) {
    if (campaign.type === "fixed_off" && campaign.amountOffMinor) {
      const scope = parseCampaignScope(campaign.scopeJson);
      const eligible = lines.filter((l) => isLineEligible(l, scope));
      const eligibleSubtotal = eligible.reduce((s, l) => s + l.lineMinor, 0);
      const base = scope ? eligibleSubtotal : subtotalMinor;
      const disc = Math.min(campaign.amountOffMinor, Math.max(0, base - sumLineDiscounts(lineDiscounts)));
      if (disc > 0) {
        cartDiscountMinor += disc;
        const allocLines = (scope ? eligible : lines).map((l) => ({
          lineKey: l.lineKey,
          lineMinor: Math.max(0, l.lineMinor - (lineDiscounts.get(l.lineKey) ?? 0)),
        }));
        mergeLineDiscounts(lineDiscounts, allocateProportional(allocLines, disc));
        appliedIds.push(campaign.id);
        labels.push(campaign.name);
        if (campaign.freeShipping) freeShipping = true;
      }
    }

    if (campaign.type === "buy_x_pay_y" && campaign.buyQuantity && campaign.payQuantity) {
      const scope = parseCampaignScope(campaign.scopeJson);
      const targetLines = scope ? lines.filter((l) => isLineEligible(l, scope)) : lines;
      const result = computeBuyXPayYDiscount(targetLines, campaign.buyQuantity, campaign.payQuantity);
      if (result.discountMinor > 0) {
        cartDiscountMinor += result.discountMinor;
        mergeLineDiscounts(lineDiscounts, result.lineDiscounts);
        appliedIds.push(campaign.id);
        labels.push(campaign.name);
        if (campaign.freeShipping) freeShipping = true;
      }
    }

    if (campaign.type === "free_shipping") {
      freeShipping = true;
      appliedIds.push(campaign.id);
      labels.push(campaign.name);
    }
  }

  if (!appliedIds.length) return emptyResult();

  return {
    campaignId: appliedIds[0]!,
    campaignIds: appliedIds,
    discountMinor: cartDiscountMinor,
    freeShipping,
    label: labels.join(" + "),
    error: null,
    lineDiscounts,
  };
}

export function prismaRowToCampaignRecord(row: {
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
  firstOrderOnly?: boolean;
  minCartMinor: number | null;
  freeShipping: boolean;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}): CampaignRecord {
  return { ...row, firstOrderOnly: row.firstOrderOnly ?? false };
}

export function campaignTypeLabel(type: string): string {
  return CAMPAIGN_TYPES.find((t) => t.id === type)?.label ?? type;
}

export function summarizeCampaignDetail(c: CampaignRecord): string {
  const scope = parseCampaignScope(c.scopeJson);
  const scopeNote = scope ? " · kapsamlı" : "";
  let detail = "—";

  if (c.type === "second_item_percent_off" && c.percentOff) {
    detail = `2. üründe %${c.percentOff}${scopeNote}`;
  } else if (c.type === "percent_off" && c.percentOff) {
    const min = c.minCartMinor != null ? ` · ${(c.minCartMinor / 100).toFixed(0)} TL+` : "";
    detail = `%${c.percentOff}${min}${scopeNote}`;
  } else if (c.type === "fixed_off" && c.amountOffMinor) {
    detail = `${(c.amountOffMinor / 100).toFixed(2)} TL${scopeNote}`;
  } else if (c.type === "buy_x_pay_y" && c.buyQuantity && c.payQuantity) {
    detail = `${c.buyQuantity} al ${c.payQuantity} öde${scopeNote}`;
  } else if (c.type === "free_shipping" || c.freeShipping) {
    detail = "Ücretsiz kargo";
  }

  if (c.firstOrderOnly && detail !== "—") return `${detail} · ilk sipariş`;
  return detail;
}
