import { cache } from "react";
import { getCachedStoreSiteBySlug } from "@/lib/cache/store-cache";
import { prisma } from "@/lib/prisma";

/** Hangi mağaza satırı — her deploy / .env dosyası kendi slug’ını kullanır */
function resolveSiteSlug() {
  return process.env.STORE_SITE_SLUG?.trim() || "demo";
}

/** Aktif mağaza (DATABASE_URL + STORE_SITE_SLUG) — istek içi + önbellek */
export const getDefaultSite = cache(async () => {
  const slug = resolveSiteSlug();
  return getCachedStoreSiteBySlug(slug);
});

export async function getPageBySlug(slug: string) {
  const site = await getDefaultSite();
  return prisma.shopPage.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
  });
}
