/**
 * Mevcut ürün başlıklarına gramaj/adet ekler (weightGrams / pieceCount dolu olanlar).
 * Kullanım: npx tsx scripts/sync-product-display-titles.ts [--site=anatolianpaw]
 */
import { PrismaClient } from "@prisma/client";
import { resolveStoredProductTitle } from "../src/lib/product-display-title";

const prisma = new PrismaClient();

async function main() {
  const siteSlug = process.argv.find((a) => a.startsWith("--site="))?.split("=")[1]?.trim();
  const site = siteSlug
    ? await prisma.storeSite.findUnique({ where: { slug: siteSlug } })
    : await prisma.storeSite.findFirst({ orderBy: { createdAt: "asc" } });
  if (!site) {
    console.error("Site bulunamadı");
    process.exit(1);
  }

  const products = await prisma.storeProduct.findMany({
    where: {
      siteId: site.id,
      OR: [{ weightGrams: { gt: 0 } }, { pieceCount: { gt: 0 } }],
    },
    select: { id: true, slug: true, title: true, weightGrams: true, pieceCount: true },
  });

  let updated = 0;
  for (const p of products) {
    const next = resolveStoredProductTitle(p.title, p.weightGrams, p.pieceCount);
    if (next === p.title) continue;
    await prisma.storeProduct.update({ where: { id: p.id }, data: { title: next } });
    console.log(`${p.slug}: ${p.title} → ${next}`);
    updated++;
  }

  console.log(`\n${updated} / ${products.length} ürün güncellendi (${site.slug})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
