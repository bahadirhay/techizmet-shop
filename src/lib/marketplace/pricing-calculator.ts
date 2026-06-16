import {
  commissionMinorFromGross,
  suggestMarketplacePriceMinor,
  type ResolvedCommissionRule,
  type ShippingModelId,
  DEFAULT_TARGET_MARGIN_PERCENT,
} from "@/lib/marketplace/commission-types";

export type ChannelEconomicsRow = {
  platform: string;
  platformLabel: string;
  grossMinor: number;
  commissionMinor: number;
  commissionPercent: number;
  shippingDeductionMinor: number;
  shippingModel: ShippingModelId;
  netPayoutMinor: number;
  costMinor: number | null;
  wholesaleMinor: number | null;
  webMinor: number;
  marginOnCostPercent: number | null;
  marginOnGrossPercent: number | null;
  wholesaleMarginOnCostPercent: number | null;
  webDiffMinor: number | null;
  usesWebFallback: boolean;
  suggestedMinor: number | null;
};

export function marketplaceShippingDeduction(rule: {
  shippingModel: ShippingModelId;
  shippingFeeMinor: number;
}): number {
  return rule.shippingModel === "marketplace_cargo" ? Math.max(0, rule.shippingFeeMinor) : 0;
}

/** Brüt pazaryeri satışından komisyon ve kargo kesintisi sonrası net hakediş (kuruş). */
export function computeMarketplaceNetPayout(
  grossMinor: number,
  rule: Pick<ResolvedCommissionRule, "commissionPercent" | "shippingModel" | "shippingFeeMinor">,
): {
  commissionMinor: number;
  shippingDeductionMinor: number;
  netPayoutMinor: number;
} {
  if (grossMinor <= 0) {
    return { commissionMinor: 0, shippingDeductionMinor: 0, netPayoutMinor: 0 };
  }
  const commissionMinor = commissionMinorFromGross(grossMinor, rule.commissionPercent);
  const shippingDeductionMinor = marketplaceShippingDeduction(rule);
  const netPayoutMinor = Math.max(0, grossMinor - commissionMinor - shippingDeductionMinor);
  return { commissionMinor, shippingDeductionMinor, netPayoutMinor };
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
): { grossMinor: number; usesWebFallback: boolean } {
  if (marketplaceOverrideMinor != null && marketplaceOverrideMinor > 0) {
    return { grossMinor: marketplaceOverrideMinor, usesWebFallback: false };
  }
  return { grossMinor: webPriceMinor, usesWebFallback: true };
}

export function buildChannelEconomicsRow(input: {
  platform: string;
  platformLabel: string;
  webPriceMinor: number;
  marketplaceOverrideMinor: number | null | undefined;
  costMinor: number | null;
  wholesaleMinor: number | null;
  rule: ResolvedCommissionRule;
  targetMarginPercent?: number;
}): ChannelEconomicsRow {
  const { grossMinor, usesWebFallback } = resolveChannelGrossMinor(
    input.webPriceMinor,
    input.marketplaceOverrideMinor,
  );
  const { commissionMinor, shippingDeductionMinor, netPayoutMinor } = computeMarketplaceNetPayout(
    grossMinor,
    input.rule,
  );

  const suggestedMinor =
    input.costMinor != null && input.costMinor > 0
      ? suggestMarketplacePriceMinor({
          costMinor: input.costMinor,
          targetMarginPercent: input.targetMarginPercent ?? DEFAULT_TARGET_MARGIN_PERCENT,
          commissionPercent: input.rule.commissionPercent,
          shippingFeeMinor: shippingDeductionMinor,
        })
      : null;

  return {
    platform: input.platform,
    platformLabel: input.platformLabel,
    grossMinor,
    commissionMinor,
    commissionPercent: input.rule.commissionPercent,
    shippingDeductionMinor,
    shippingModel: input.rule.shippingModel,
    netPayoutMinor,
    costMinor: input.costMinor,
    wholesaleMinor: input.wholesaleMinor,
    webMinor: input.webPriceMinor,
    marginOnCostPercent: marginOnCostPercent(netPayoutMinor, input.costMinor),
    marginOnGrossPercent: marginOnGrossPercent(netPayoutMinor, grossMinor, input.costMinor),
    wholesaleMarginOnCostPercent:
      input.wholesaleMinor != null && input.wholesaleMinor > 0
        ? marginOnCostPercent(input.wholesaleMinor, input.costMinor)
        : null,
    webDiffMinor:
      input.webPriceMinor > 0 && grossMinor > 0 ? grossMinor - input.webPriceMinor : null,
    usesWebFallback,
    suggestedMinor,
  };
}
