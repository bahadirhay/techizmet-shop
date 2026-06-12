import { cache } from "react";
import { getCachedStoreSiteBySlug } from "@/lib/cache/store-cache";
import { prisma } from "@/lib/prisma";
import { ensureStoreTenant } from "@/lib/store-tenant";

/** Aktif mağaza — host (shop.techizmet.com → demo) + tenant DB */
export const getDefaultSite = cache(async () => {
  const tenant = await ensureStoreTenant();
  return getCachedStoreSiteBySlug(tenant.slug, tenant.databaseUrl);
});

export async function getPageBySlug(slug: string) {
  const site = await getDefaultSite();
  return prisma.shopPage.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
  });
}
