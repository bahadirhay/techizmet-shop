import { prisma } from "@/lib/prisma";

/** Hangi mağaza satırı — her deploy / .env dosyası kendi slug’ını kullanır */
function resolveSiteSlug() {
  return process.env.STORE_SITE_SLUG?.trim() || "demo";
}

/** Aktif mağaza (DATABASE_URL + STORE_SITE_SLUG) */
export async function getDefaultSite() {
  const slug = resolveSiteSlug();
  const site = await prisma.storeSite.findUnique({ where: { slug } });
  if (!site) {
    throw new Error(
      `Mağaza bulunamadı (slug="${slug}"). Önce: npm run db:push && npm run store:provision -- --slug=${slug}`,
    );
  }
  return site;
}

export async function getPageBySlug(slug: string) {
  const site = await getDefaultSite();
  return prisma.shopPage.findUnique({
    where: { siteId_slug: { siteId: site.id, slug } },
  });
}
