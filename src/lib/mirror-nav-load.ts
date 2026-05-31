import type { ShopLocale } from "@/lib/i18n/locale";
import { resolveStoreNavItems, type ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import { getPublishedHeaderNavTree } from "@/lib/nav-menu-server";
import { prisma } from "@/lib/prisma";
import { getStoreNavItems } from "@/lib/store-navigation";
import { getSiteSettingsUncached } from "@/lib/site-settings-load";

async function navFromSiteSettings(
  siteId: string,
  locale: ShopLocale,
): Promise<ResolvedNavItem[]> {
  const settings = await getSiteSettingsUncached(siteId);
  const items = getStoreNavItems(settings);
  const collections = await prisma.storeCollection.findMany({
    where: { siteId, published: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { slug: true, title: true },
  });
  return resolveStoreNavItems(items, locale, collections);
}

/** Derleme ve çalışma zamanı — önbelleksiz menü (prebuild betiği ile uyumlu) */
export async function loadMirrorNavItemsUncached(
  siteId: string,
  locale: ShopLocale,
): Promise<ResolvedNavItem[]> {
  const fromDb = await getPublishedHeaderNavTree(siteId, locale);
  if (fromDb?.length) return fromDb;
  return navFromSiteSettings(siteId, locale);
}
