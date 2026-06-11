import type { OrderFinanceSnapshot } from "@/lib/finance/order-economics";

export function cardFeeMinorFromGross(grossMinor: number, percent: number): number {
  if (percent <= 0 || grossMinor <= 0) return 0;
  return Math.round((grossMinor * percent) / 100);
}

/** Sipariş snapshot'ındaki tahmini işletme giderleri (komisyon, kargo, paket, ödeme). */
export function totalOperatingCostsFromSnapshot(snap: OrderFinanceSnapshot): number {
  return (
    snap.totalCommissionMinor +
    snap.shippingDeductionMinor +
    (snap.shippingCostMinor ?? 0) +
    (snap.packagingCostMinor ?? 0) +
    snap.paymentFeeMinor
  );
}

export type SingleWebOrderProfitInput = {
  priceMinor: number;
  costMinor: number;
  webShippingCostMinor: number;
  packagingCostMinor: number;
  cardFeePercent: number;
};

export type SingleWebOrderProfitResult = {
  grossMinor: number;
  costMinor: number;
  shippingCostMinor: number;
  packagingCostMinor: number;
  paymentFeeMinor: number;
  netProfitMinor: number;
  grossMarginPercent: number | null;
  netMarginPercent: number | null;
};

/** Tek ürünlü web siparişi + kart ödemesi varsayımı. */
export function estimateSingleWebOrderProfit(
  input: SingleWebOrderProfitInput,
): SingleWebOrderProfitResult | null {
  const { priceMinor, costMinor, webShippingCostMinor, packagingCostMinor, cardFeePercent } = input;
  if (priceMinor <= 0) return null;

  const paymentFeeMinor = cardFeeMinorFromGross(priceMinor, cardFeePercent);
  const netProfitMinor =
    priceMinor - costMinor - webShippingCostMinor - packagingCostMinor - paymentFeeMinor;

  const grossMarginPercent =
    costMinor > 0 && priceMinor > costMinor
      ? Math.round(((priceMinor - costMinor) / priceMinor) * 1000) / 10
      : costMinor > 0
        ? Math.round(((priceMinor - costMinor) / priceMinor) * 1000) / 10
        : null;

  const netMarginPercent =
    netProfitMinor !== 0 || costMinor > 0
      ? Math.round((netProfitMinor / priceMinor) * 1000) / 10
      : null;

  return {
    grossMinor: priceMinor,
    costMinor,
    shippingCostMinor: webShippingCostMinor,
    packagingCostMinor,
    paymentFeeMinor,
    netProfitMinor,
    grossMarginPercent,
    netMarginPercent,
  };
}
