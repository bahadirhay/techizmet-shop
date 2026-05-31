import "server-only";

import type { CustomerGroupPricing } from "@/lib/customer-group-pricing";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorProductCommercePayload } from "@/lib/mirror-product-commerce";
import { loadMirrorProductCommerceUncached } from "@/lib/mirror-product-commerce-load";
import { getLoggedInCustomerPricing } from "@/lib/store/customer-pricing";
import type { StoreTextSettings } from "@/lib/store-static-texts";

export { loadMirrorProductCommerceUncached } from "@/lib/mirror-product-commerce-load";

export async function loadMirrorProductCommerce(
  siteId: string,
  slug: string,
  locale: ShopLocale,
  textSettings?: StoreTextSettings,
  options?: { skipSession?: boolean; memberPricing?: CustomerGroupPricing | null },
): Promise<MirrorProductCommercePayload | null> {
  const memberPricing = options?.skipSession
    ? (options.memberPricing ?? null)
    : (options?.memberPricing ?? (await getLoggedInCustomerPricing(siteId)));
  return loadMirrorProductCommerceUncached(siteId, slug, locale, textSettings, {
    ...options,
    memberPricing,
  });
}
