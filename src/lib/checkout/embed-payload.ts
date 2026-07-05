import "server-only";

import type { ShopLocale } from "@/lib/i18n/locale";
import { getCartCustomerId } from "@/lib/cart/customer-id";
import { buildCartView, getShippingOptions } from "@/lib/cart/service";
import { getCartSession } from "@/lib/cart/session";
import { getCheckoutPrefill } from "@/lib/checkout/prefill";
import { getCheckoutPaymentContext } from "@/lib/checkout/payment-context";
import type { CheckoutPaymentContext } from "@/lib/checkout/payment-context";
import type { CheckoutPrefill } from "@/lib/checkout/prefill";
import type { CartView } from "@/lib/cart/types";
import { getEffectiveUsdTryRate } from "@/lib/currency/exchange-rate";
import { resolveLegalSellerProfile } from "@/lib/legal/seller-profile";
import type { LegalSellerProfile } from "@/lib/legal/seller-profile";
import { getSiteSettings } from "@/lib/site-settings";
import type { SiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";
import type { TrCity } from "@/lib/tr-address/index";
import { listTrCities, listTrDistricts, listTrNeighborhoods } from "@/lib/tr-address/index";

export type TrAddressBootstrap = {
  cities: TrCity[];
  city?: string;
  districts?: string[];
  district?: string;
  neighborhoods?: string[];
};

export type CheckoutEmbedPayload = {
  initialCart: CartView;
  prefill: CheckoutPrefill | null;
  payment: CheckoutPaymentContext;
  locale: ShopLocale;
  sellerProfile: LegalSellerProfile;
  usdRate: number | null;
  initialShipping: Awaited<ReturnType<typeof getShippingOptions>>;
  initialFreeShipping: boolean;
  trAddress: TrAddressBootstrap;
};

/** Sepet + ödeme formu — /checkout ve /checkout/embed ortak sunucu yükü */
export async function loadCheckoutEmbedPayload(
  site: { id: string; name: string },
  locale: ShopLocale,
  settings?: SiteSettings,
): Promise<CheckoutEmbedPayload> {
  const resolvedSettings = settings ?? (await getSiteSettings(site.id));
  const session = await getCartSession();
  const customerId = await getCartCustomerId();
  const initialCart = await buildCartView(
    { items: session.items, couponCode: session.couponCode },
    site.id,
    customerId,
  );
  const prefill = await getCheckoutPrefill(site.id);
  const payment = await getCheckoutPaymentContext(resolvedSettings, site.id, customerId);
  const sellerProfile = resolveLegalSellerProfile(resolvedSettings, site);
  const usdRate =
    locale === "en"
      ? await getEffectiveUsdTryRate(resolvedSettings.store?.usdMarkupPercent ?? 0)
      : null;

  let initialShipping: Awaited<ReturnType<typeof getShippingOptions>> = [];
  if (initialCart.items.length > 0 && !initialCart.freeShipping) {
    const products = await prisma.storeProduct.findMany({
      where: { id: { in: initialCart.items.map((i) => i.productId) } },
      select: { desi: true },
    });
    const totalDesi = Math.max(1, products.reduce((s, p) => s + (p.desi ?? 1), 0));
    initialShipping = await getShippingOptions(
      site.id,
      initialCart.subtotalMinor - initialCart.discountMinor,
      false,
      totalDesi,
    );
  }

  const trCities = listTrCities();
  const prefillAddr = prefill?.addresses.find((a) => a.isDefault) ?? prefill?.addresses[0];
  const trAddress: TrAddressBootstrap = { cities: trCities };
  if (prefillAddr?.city) {
    trAddress.city = prefillAddr.city;
    trAddress.districts = listTrDistricts(prefillAddr.city);
    if (prefillAddr.district) {
      trAddress.district = prefillAddr.district;
      trAddress.neighborhoods = listTrNeighborhoods(prefillAddr.city, prefillAddr.district);
    }
  }

  return {
    initialCart,
    prefill,
    payment,
    locale,
    sellerProfile,
    usdRate,
    initialShipping,
    initialFreeShipping: initialCart.freeShipping,
    trAddress,
  };
}
