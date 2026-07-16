import type { OrderFinanceLineSnapshot, OrderFinanceSnapshot } from "@/lib/finance/order-economics";
import { PRODUCT_KIND_BUNDLE } from "@/lib/product-bundle";

export function cardFeeMinorFromGross(grossMinor: number, percent: number): number {
  if (percent <= 0 || grossMinor <= 0) return 0;
  return Math.round((grossMinor * percent) / 100);
}

/** Sipariş snapshot'ındaki tahmini işletme giderleri (komisyon, kargo, paket, ödeme). */
export function totalOperatingCostsFromSnapshot(snap: OrderFinanceSnapshot): number {
  return (
    snap.totalCommissionMinor +
    snap.shippingDeductionMinor +
    (snap.marketplaceFixedFeeMinor ?? 0) +
    (snap.shippingCostMinor ?? 0) +
    (snap.packagingCostMinor ?? 0) +
    snap.paymentFeeMinor
  );
}

/** Pazaryeri komisyon + kargo kesintisi (ürün maliyeti hariç). */
export function marketplaceDeductionsFromSnapshot(snap: OrderFinanceSnapshot): number {
  return snap.totalCommissionMinor + snap.shippingDeductionMinor + (snap.marketplaceFixedFeeMinor ?? 0);
}

/** Web siparişi: paketleme + kart komisyonu + satıcı kargo gideri. */
export function webOperatingCostsFromSnapshot(snap: OrderFinanceSnapshot): number {
  return (snap.shippingCostMinor ?? 0) + (snap.packagingCostMinor ?? 0) + snap.paymentFeeMinor;
}

/** Satır ürün maliyeti (adet × birim; paket satırında satır toplamı). */
export function lineProductCostMinor(line: OrderFinanceLineSnapshot): number {
  const unitOrLine = line.costMinor ?? 0;
  if (unitOrLine <= 0) return 0;
  if (line.lineKind === PRODUCT_KIND_BUNDLE) return unitOrLine;
  return unitOrLine * line.qty;
}

/** Satıra düşen web işletme gideri payı (paket, kart, kargo). */
export function lineWebOperatingCostMinor(
  snap: OrderFinanceSnapshot,
  line: OrderFinanceLineSnapshot,
): number {
  const gross = snap.grossMinor;
  if (gross <= 0) return 0;
  const share = line.lineMinor / gross;
  return Math.round(webOperatingCostsFromSnapshot(snap) * share);
}

/** Satıra düşen pazaryeri kesintisi payı. */
export function lineMarketplaceDeductionMinor(
  snap: OrderFinanceSnapshot,
  line: OrderFinanceLineSnapshot,
): number {
  const gross = snap.grossMinor;
  if (gross <= 0) return 0;
  const share = line.lineMinor / gross;
  return Math.round(marketplaceDeductionsFromSnapshot(snap) * share);
}

/** Ürün + paketleme + kart komisyonu (+ web kargo payı). */
export function lineTotalCostMinor(
  snap: OrderFinanceSnapshot,
  line: OrderFinanceLineSnapshot,
  isMarketplace: boolean,
): number {
  return lineProductCostMinor(line) + (isMarketplace ? 0 : lineWebOperatingCostMinor(snap, line));
}

/** Sipariş toplam maliyeti: ürün maliyetleri + web işletme giderleri. */
export function orderTotalCostMinor(snap: OrderFinanceSnapshot, isMarketplace: boolean): number {
  return (snap.totalCostMinor ?? 0) + (isMarketplace ? 0 : webOperatingCostsFromSnapshot(snap));
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
