/** Trendyol kesinti kayıtlarını kategoriye ayırmak için notes / açıklama sabitleri */

export const TY_SETTLEMENT_COMMISSION_NOTE = "trendyol-settlement-commission";
export const TY_PAYOUT_CARGO_NOTE = "trendyol-payout-cargo";
export const TY_PAYOUT_PLATFORM_NOTE = "trendyol-payout-platformFee";
export const TY_PAYOUT_STOPPAGE_NOTE = "trendyol-payout-stoppage";
export const TY_PAYOUT_PENALTY_NOTE = "trendyol-payout-penalty";
export const TY_PAYOUT_ADVERTISING_NOTE = "trendyol-payout-advertising";
export const TY_PAYOUT_MICRO_EXPORT_NOTE = "trendyol-payout-microExportReturn";
export const TY_PAYOUT_OTHER_NOTE = "trendyol-payout-other";

export type TrendyolDeductionCategory =
  | "commission"
  | "cargo"
  | "platform"
  | "stoppage"
  | "penalty"
  | "advertising"
  | "microExport"
  | "other"
  | "unknown";

export function classifyDeductionTx(tx: {
  notes?: string | null;
  description?: string | null;
  reconciliationStatus?: string | null;
}): TrendyolDeductionCategory {
  const notes = (tx.notes ?? "").toLowerCase();
  const desc = (tx.description ?? "").toLocaleLowerCase("tr-TR");

  if (
    notes === TY_SETTLEMENT_COMMISSION_NOTE ||
    notes.includes("settlement-commission") ||
    desc.includes("gerçek komisyon") ||
    desc.includes("tahmini komisyon")
  ) {
    return "commission";
  }
  if (
    notes === TY_PAYOUT_CARGO_NOTE ||
    notes.includes("payout-cargo") ||
    desc.includes("kargo")
  ) {
    return "cargo";
  }
  if (
    notes === TY_PAYOUT_PLATFORM_NOTE ||
    notes.includes("payout-platform") ||
    desc.includes("platform") ||
    desc.includes("sabit pazaryeri")
  ) {
    return "platform";
  }
  if (notes === TY_PAYOUT_STOPPAGE_NOTE || desc.includes("stopaj")) {
    return "stoppage";
  }
  if (notes === TY_PAYOUT_PENALTY_NOTE || desc.includes("ceza")) {
    return "penalty";
  }
  if (notes === TY_PAYOUT_ADVERTISING_NOTE || desc.includes("reklam")) {
    return "advertising";
  }
  if (
    notes === TY_PAYOUT_MICRO_EXPORT_NOTE ||
    desc.includes("yurtdışı") ||
    desc.includes("mikro")
  ) {
    return "microExport";
  }
  if (notes === TY_PAYOUT_OTHER_NOTE) return "other";
  return "unknown";
}

/** Tahmini satırın hangi kategoriyi temsil ettiği */
export function estimatedCategoryFromDescription(
  description: string | null,
): TrendyolDeductionCategory | null {
  const desc = (description ?? "").toLocaleLowerCase("tr-TR");
  if (desc.includes("tahmini komisyon")) return "commission";
  if (desc.includes("tahmini kargo")) return "cargo";
  if (desc.includes("tahmini sabit")) return "platform";
  return null;
}
