/**
 * Tüm ürünlerin PDP içeriğini vitrin mirror HTML ile DB'de eşitler.
 * npx tsx scripts/sync-all-mirror-content.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadMirrorProductContent } from "../src/lib/mirror-product-content";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

async function main() {
  const site = await prisma.storeSite.findFirst({ where: { slug: "demo" } });
  if (!site) throw new Error("demo site yok");

  const products = await prisma.storeProduct.findMany({
    where: { siteId: site.id },
    select: { id: true, slug: true },
  });

  let ok = 0;
  let skip = 0;
  for (const p of products) {
    const content = loadMirrorProductContent(p.slug);
    if (!content) {
      console.warn(`[skip] ${p.slug}: mirror HTML yok`);
      skip++;
      continue;
    }
    await prisma.storeProduct.update({
      where: { id: p.id },
      data: {
        description: content.description,
        descriptionHtml: content.descriptionHtml,
        keyFeaturesHtml: content.keyFeaturesHtml,
        howToUseHtml: content.howToUseHtml,
      },
    });
    ok++;
  }
  console.log(`[sync-all-mirror-content] ${ok} güncellendi, ${skip} atlandı`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
