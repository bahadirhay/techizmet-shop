/**
 * Koleksiyon kapak görsellerini mirror → shop.collection.image_url
 * npx tsx scripts/sync-collection-images.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { getMirrorCollectionImage } from "../src/lib/mirror-collection-images";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

async function main() {
  const site = await prisma.storeSite.findFirst({ where: { slug: "demo" } });
  if (!site) throw new Error("demo site yok");

  const collections = await prisma.storeCollection.findMany({
    where: { siteId: site.id },
    select: { id: true, slug: true, imageUrl: true },
  });

  let ok = 0;
  let skip = 0;
  for (const c of collections) {
    const url = getMirrorCollectionImage(c.slug);
    if (!url) {
      if (c.imageUrl) {
        await prisma.storeCollection.update({ where: { id: c.id }, data: { imageUrl: null } });
        console.log(`[clear] ${c.slug}: vitrin kartı yok, image_url temizlendi`);
        ok++;
      } else {
        console.warn(`[skip] ${c.slug}: mirror görsel yok`);
        skip++;
      }
      continue;
    }
    if (c.imageUrl === url) {
      skip++;
      continue;
    }
    await prisma.storeCollection.update({
      where: { id: c.id },
      data: { imageUrl: url },
    });
    ok++;
    console.log(`[ok] ${c.slug} → ${url}`);
  }
  console.log(`[sync-collection-images] ${ok} güncellendi, ${skip} atlandı`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
