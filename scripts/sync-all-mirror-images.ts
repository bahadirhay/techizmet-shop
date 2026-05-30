/**
 * Vitrin PDP galeri görsellerini DB product_image tablosuna yazar.
 * npx tsx scripts/sync-all-mirror-images.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadMirrorProductImages } from "../src/lib/mirror-product-images";

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
    const urls = loadMirrorProductImages(p.slug);
    if (!urls.length) {
      console.warn(`[skip] ${p.slug}: galeri yok`);
      skip++;
      continue;
    }
    await prisma.$transaction(async (tx) => {
      await tx.storeProductImage.deleteMany({ where: { productId: p.id } });
      await tx.storeProductImage.createMany({
        data: urls.map((url, i) => ({ productId: p.id, url, sortOrder: i })),
      });
      await tx.storeProduct.update({
        where: { id: p.id },
        data: { imageUrl: urls[0] },
      });
    });
    ok++;
    console.log(`[ok] ${p.slug}: ${urls.length} görsel`);
  }
  console.log(`[sync-all-mirror-images] ${ok} ürün, ${skip} atlandı`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
