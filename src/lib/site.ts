import { cache } from "react";
import { getCachedStoreSiteBySlug } from "@/lib/cache/store-cache";
import { prisma } from "@/lib/prisma";
import { ensureStoreTenant } from "@/lib/store-tenant";

/** Slug+DB başına site kaydı — istek içinde tekrar sorgu yapma */
const getCachedSiteForTenant = cache((slug: string, databaseUrl: string) =>
  getCachedStoreSiteBySlug(slug, databaseUrl),
);

/**
 * Aktif mağaza — host (shop.techizmet.com → demo) + tenant DB.
 *
 * `ensureStoreTenant()` her çağrıda çalışır: tenant'ı ÇAĞIRANIN async
 * context'ine yazar (RSC layout→page geçişinde context kaybını önler).
 * Site kaydı sorgusu slug+DB'ye göre cache'lidir, bu yüzden ek maliyet yok.
 */
export async function getDefaultSite() {
  const tenant = await ensureStoreTenant();
  return getCachedSiteForTenant(tenant.slug, tenant.databaseUrl);
}

export async function getPageBySlug(slug: string) {
  const site = await getDefaultSite();
  return prisma.shopPage.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
  });
}
