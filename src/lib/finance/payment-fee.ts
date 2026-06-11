import "server-only";

import { cardFeeMinorFromGross } from "@/lib/finance/economics-math";
import type { SiteSettings } from "@/lib/site-settings";

export { cardFeeMinorFromGross };

const DEFAULT_CARD_FEE_PERCENT = 2.4;

/** Tahmini PayTR / kart komisyon oranı (%) — site ayarı yoksa varsayılan */
export function resolveCardFeePercent(settings: SiteSettings): number {
  const raw = settings.finance?.cardFeePercent;
  if (typeof raw === "number" && raw >= 0 && raw <= 15) return raw;
  return DEFAULT_CARD_FEE_PERCENT;
}

export async function resolvePaymentFeeForOrder(
  siteId: string,
  paymentMethod: string | null,
  marketplacePlatform: string | null,
  grossMinor: number,
): Promise<{ paymentFeeMinor: number; paymentFeePercent: number | null }> {
  if (marketplacePlatform || paymentMethod !== "card" || grossMinor <= 0) {
    return { paymentFeeMinor: 0, paymentFeePercent: null };
  }
  const { getSiteSettings } = await import("@/lib/site-settings");
  const settings = await getSiteSettings(siteId);
  const percent = resolveCardFeePercent(settings);
  return {
    paymentFeePercent: percent,
    paymentFeeMinor: cardFeeMinorFromGross(grossMinor, percent),
  };
}
