import "server-only";

import { calculateOrderContributionGrams } from "@/lib/street-food-fund/contribution";
import { getStreetFoodFundSettings } from "@/lib/street-food-fund/settings";
import { getSiteSettings } from "@/lib/site-settings";
import type { ShopLocale } from "@/lib/i18n/locale";

export function formatStreetFoodContributionGrams(grams: number, locale: ShopLocale): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    const text = kg >= 10 ? kg.toFixed(1) : kg.toFixed(2);
    return locale === "tr" ? `${text.replace(".", ",")} kg` : `${text} kg`;
  }
  return `${grams} g`;
}

export function buildStreetFoodContributionMessage(grams: number, locale: ShopLocale): string {
  const amount = formatStreetFoodContributionGrams(grams, locale);
  return locale === "tr"
    ? `Bu siparişle Sokak Dostları Mama Fonu'na ${amount} katkıda bulundunuz.`
    : `With this order you contributed ${amount} to the Street Friends Food Fund.`;
}

export function buildStreetFoodContributionHtml(message: string): string {
  return `<p style="margin:16px 0;padding:12px 16px;background:#e8f5ef;border-radius:8px;color:#1f4d3a;font-size:14px;line-height:1.45">${message}</p>`;
}

export async function getStreetFoodContributionForOrder(
  siteId: string,
  orderId: string,
  locale: ShopLocale = "tr",
): Promise<{ grams: number; message: string; html: string } | null> {
  const settings = await getSiteSettings(siteId);
  const cfg = getStreetFoodFundSettings(settings);
  if (!cfg.enabled) return null;

  const grams = await calculateOrderContributionGrams(orderId, siteId);
  if (grams <= 0) return null;

  const message = buildStreetFoodContributionMessage(grams, locale);
  return { grams, message, html: buildStreetFoodContributionHtml(message) };
}
