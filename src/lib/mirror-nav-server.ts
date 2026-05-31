import "server-only";

import { unstable_cache } from "next/cache";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  STORE_PUBLIC_REVALIDATE_SEC,
  storeMirrorTag,
  storeNavTag,
} from "@/lib/cache/store-cache";
import { resolveStoreNavItems, type ResolvedNavItem } from "@/lib/mirror-nav-resolve";
import { getPublishedHeaderNavTree } from "@/lib/nav-menu-server";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, getStoreNavItems } from "@/lib/site-settings";
async function navFromSiteSettings(
  siteId: string,
  locale: ShopLocale,
): Promise<ResolvedNavItem[]> {
  const settings = await getSiteSettings(siteId);
  const items = getStoreNavItems(settings);
  const collections = await prisma.storeCollection.findMany({
    where: { siteId, published: true },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { slug: true, title: true },
  });
  return resolveStoreNavItems(items, locale, collections);
}

/** Sunucu — vitrin iframe menüsü (DB menüsü; yoksa site ayarlarından) */
export async function loadMirrorNavItemsUncached(
  siteId: string,
  locale: ShopLocale,
): Promise<ResolvedNavItem[]> {
  const fromDb = await getPublishedHeaderNavTree(siteId, locale);
  if (fromDb?.length) return fromDb;
  return navFromSiteSettings(siteId, locale);
}

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
