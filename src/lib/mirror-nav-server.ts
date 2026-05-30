import "server-only";

import type { ShopLocale } from "@/lib/i18n/locale";
import type { ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import { getPublishedHeaderNavTree } from "@/lib/nav-menu-server";

/** Sunucu — vitrin iframe menüsü (yalnızca admin DB menüsü; JSON şablon yedek yok) */
export async function loadMirrorNavItems(
  siteId: string,
  locale: ShopLocale,
): Promise<ResolvedNavItem[]> {
  const fromDb = await getPublishedHeaderNavTree(siteId, locale);
  return fromDb ?? [];
}
