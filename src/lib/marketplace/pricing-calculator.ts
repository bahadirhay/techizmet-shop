import {
  commissionMinorFromGross,
  type ResolvedCommissionRule,
  type ShippingModelId,
} from "@/lib/marketplace/commission-types";

/** Web fiyatı üzerinden varsayılan pazaryeri artışı (%) */
export const DEFAULT_WEB_MARKUP_PERCENT = 15;

export const MARKETPLACE_MARKUP_PRESETS = [10, 15, 20] as const;

export type ChannelEconomicsRow = {
  platform: string;
  platformLabel: string;
  grossMinor: number;
  commissionMinor: number;
  commissionPercent: number;
  extraCommissionMinor: number;
  extraCommissionPercent: number;
  shippingDeductionMinor: number;
  shippingModel: ShippingModelId;
  netPayoutMinor: number;
  costMinor: number | null;
  wholesaleMinor: number | null;
  webMinor: number;
  markupPercent: number | null;
  marginOnCostPercent: number | null;
  marginOnGrossPercent: number | null;
  wholesaleMarginOnCostPercent: number | null;
  webDiffMinor: number | null;
  usesWebFallback: boolean;
  usesWebMarkup: boolean;
  suggestedMinor: number | null;
};

export function normalizeMarkupPercent(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

/** Web satış fiyatına yüzde fark uygular (kuruş). Negatif = indirim. */
export function webMarkupPriceMinor(webMinor: number, markupPercent: number): number | null {
  if (webMinor <= 0) return null;
  return Math.max(0, Math.round(webMinor * (1 + markupPercent / 100)));
}

/** Kanal fiyatından web'e göre markup % tahmin eder. */
export function inferMarkupPercentFromPrices(webMinor: number, channelMinor: number): number | null {
  if (webMinor <= 0 || channelMinor <= 0) return null;
  return Math.round((channelMinor / webMinor - 1) * 1000) / 10;
}

export function marketplaceShippingDeduction(rule: {
  shippingModel: ShippingModelId;
  shippingFeeMinor: number;
}): number {
  return rule.shippingModel === "marketplace_cargo" ? Math.max(0, rule.shippingFeeMinor) : 0;
}

/** Brüt pazaryeri satışından komisyon ve kargo kesintisi sonrası net hakediş (kuruş). */
export function computeMarketplaceNetPayout(
  grossMinor: number,
  rule: Pick<
    ResolvedCommissionRule,
    "commissionPercent" | "extraCommissionPercent" | "shippingModel" | "shippingFeeMinor"
  >,
): {
  commissionMinor: number;
  primaryCommissionMinor: number;
  extraCommissionMinor: number;
  shippingDeductionMinor: number;
  netPayoutMinor: number;
} {
  if (grossMinor <= 0) {
    return {
      commissionMinor: 0,
      primaryCommissionMinor: 0,
      extraCommissionMinor: 0,
      shippingDeductionMinor: 0,
      netPayoutMinor: 0,
    };
  }
  const primaryCommissionMinor = commissionMinorFromGross(grossMinor, rule.commissionPercent);
  const extraCommissionMinor = commissionMinorFromGross(
    grossMinor,
    rule.extraCommissionPercent ?? 0,
  );
  const commissionMinor = primaryCommissionMinor + extraCommissionMinor;
  const shippingDeductionMinor = marketplaceShippingDeduction(rule);
  const netPayoutMinor = Math.max(0, grossMinor - commissionMinor - shippingDeductionMinor);
  return {
    commissionMinor,
    primaryCommissionMinor,
    extraCommissionMinor,
    shippingDeductionMinor,
    netPayoutMinor,
  };
}

export function marginOnCostPercent(netMinor: number, costMinor: number | null | undefined): number | null {
  if (costMinor == null || costMinor <= 0) return null;
  return Math.round(((netMinor - costMinor) / costMinor) * 1000) / 10;
}

export function marginOnGrossPercent(netMinor: number, grossMinor: number, costMinor: number | null): number | null {
  if (costMinor == null || costMinor <= 0 || grossMinor <= 0) return null;
  return Math.round(((netMinor - costMinor) / grossMinor) * 1000) / 10;
}

export function resolveChannelGrossMinor(
  webPriceMinor: number,
  marketplaceOverrideMinor: number | null | undefined,
  markupPercent?: number | null,
): { grossMinor: number; usesWebFallback: boolean; usesWebMarkup: boolean } {
  if (marketplaceOverrideMinor != null && marketplaceOverrideMinor > 0) {
    return { grossMinor: marketplaceOverrideMinor, usesWebFallback: false, usesWebMarkup: false };
  }
  const markup = normalizeMarkupPercent(markupPercent);
  if (markup != null && webPriceMinor > 0) {
    const fromMarkup = webMarkupPriceMinor(webPriceMinor, markup);
    if (fromMarkup != null && fromMarkup > 0) {
      return { grossMinor: fromMarkup, usesWebFallback: false, usesWebMarkup: true };
    }
  }
  return { grossMinor: webPriceMinor, usesWebFallback: true, usesWebMarkup: false };
}

export function resolveSuggestedMarketplacePriceMinor(input: {
  webPriceMinor: number;
  markupPercent?: number | null;
}): number | null {
  if (input.webPriceMinor <= 0) return null;
  const markup = normalizeMarkupPercent(input.markupPercent) ?? DEFAULT_WEB_MARKUP_PERCENT;
  return webMarkupPriceMinor(input.webPriceMinor, markup);
}

export function buildChannelEconomicsRow(input: {
  platform: string;
  platformLabel: string;
  webPriceMinor: number;
  marketplaceOverrideMinor: number | null | undefined;
  markupPercent?: number | null;
  costMinor: number | null;
  wholesaleMinor: number | null;
  rule: ResolvedCommissionRule;
}): ChannelEconomicsRow {
  const { grossMinor, usesWebFallback, usesWebMarkup } = resolveChannelGrossMinor(
    input.webPriceMinor,
    input.marketplaceOverrideMinor,
    input.markupPercent,
  );
  const { commissionMinor, extraCommissionMinor, shippingDeductionMinor, netPayoutMinor } =
    computeMarketplaceNetPayout(grossMinor, input.rule);

  const suggestedMinor = resolveSuggestedMarketplacePriceMinor({
    webPriceMinor: input.webPriceMinor,
    markupPercent: input.markupPercent,
  });

  const effectiveMarkup =
    normalizeMarkupPercent(input.markupPercent) ??
    (grossMinor > 0 && input.webPriceMinor > 0 && !usesWebFallback
      ? inferMarkupPercentFromPrices(input.webPriceMinor, grossMinor)
      : null);

  return {
    platform: input.platform,
    platformLabel: input.platformLabel,
    grossMinor,
    commissionMinor,
    commissionPercent: input.rule.commissionPercent,
    extraCommissionMinor,
    extraCommissionPercent: input.rule.extraCommissionPercent ?? 0,
    shippingDeductionMinor,
    shippingModel: input.rule.shippingModel,
    netPayoutMinor,
    costMinor: input.costMinor,
    wholesaleMinor: input.wholesaleMinor,
    webMinor: input.webPriceMinor,
    markupPercent: effectiveMarkup,
    marginOnCostPercent: marginOnCostPercent(netPayoutMinor, input.costMinor),
    marginOnGrossPercent: marginOnGrossPercent(netPayoutMinor, grossMinor, input.costMinor),
    wholesaleMarginOnCostPercent:
      input.wholesaleMinor != null && input.wholesaleMinor > 0
        ? marginOnCostPercent(input.wholesaleMinor, input.costMinor)
        : null,
    webDiffMinor:
      input.webPriceMinor > 0 && grossMinor > 0 ? grossMinor - input.webPriceMinor : null,
    usesWebFallback,
    usesWebMarkup,
    suggestedMinor,
  };
}
