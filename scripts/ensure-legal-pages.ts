/**
 * Yasal CMS sayfalarını (mesafeli-satis, kvkk) mevcut mağazaya ekler.
 *
 *   npx tsx scripts/ensure-legal-pages.ts --env-file=.env.anatolianpaw
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { ensureLegalCmsPages } from "../src/lib/ensure-legal-cms-pages";

const envFile = process.argv.find((a) => a.startsWith("--env-file="))?.split("=")[1];
if (envFile) config({ path: resolve(envFile) });

const prisma = new PrismaClient();

async function main() {
  const slug = process.env.STORE_SITE_SLUG?.trim() || "demo";
  const site = await prisma.storeSite.findUnique({ where: { slug } });
  if (!site) throw new Error(`Site bulunamadı: ${slug}`);

  await ensureLegalCmsPages(site.id);

  for (const pageSlug of ["mesafeli-satis", "kvkk"]) {
    const page = await prisma.shopPage.findUnique({
      where: { siteId_slug: { siteId: site.id, slug: pageSlug } },
    });
    console.log(`${pageSlug}: ${page ? page.title : "eksik"}`);
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
