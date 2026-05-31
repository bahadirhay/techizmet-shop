import "server-only";

import { unstable_cache } from "next/cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
  storeNavTag,
} from "@/lib/cache/store-cache";
import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import { loadMirrorNavItemsUncached } from "@/lib/mirror-nav-load";

export { loadMirrorNavItemsUncached } from "@/lib/mirror-nav-load";

/** Önbellekli menü — vitrin sayfaları */
export async function loadMirrorNavItems(
  siteId: string,
  locale: ShopLocale,
): Promise<ResolvedNavItem[]> {
  return unstable_cache(
    () => loadMirrorNavItemsUncached(siteId, locale),
    ["mirror-nav", siteId, locale],
    {
      revalidate: STORE_PUBLIC_REVALIDATE_SEC,
      tags: [storeNavTag(siteId), storeMirrorTag(siteId)],
    },
  )();
}
