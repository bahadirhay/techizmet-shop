import "server-only";

import { getCartCustomerId } from "@/lib/cart/customer-id";
import { buildCartView } from "@/lib/cart/service";
import { getCartSession } from "@/lib/cart/session";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorCartPagePayload } from "@/lib/mirror-cart-page";
import { getDefaultSite } from "@/lib/site";

export async function loadMirrorCartPagePayload(locale: ShopLocale): Promise<MirrorCartPagePayload> {
  const site = await getDefaultSite();
  const session = await getCartSession();
  const cart = await buildCartView(
    { items: session.items, couponCode: session.couponCode },
    site.id,
    await getCartCustomerId(),
  );
  return { cart, locale };
}
