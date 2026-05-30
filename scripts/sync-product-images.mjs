#!/usr/bin/env node
/** DB ürün imageUrl alanlarını mirror-product-variants.json ile günceller */
import { config } from "dotenv";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();
const variants = JSON.parse(
  readFileSync(resolve(process.cwd(), "src/lib/catalog/mirror-product-variants.json"), "utf8"),
);

async function main() {
  const site = await prisma.storeSite.findFirst({ where: { slug: "demo" } });
  if (!site) throw new Error("demo site yok — npm run db:seed");

  let updated = 0;
  for (const [slug, data] of Object.entries(variants)) {
    if (!data.imageUrl) continue;
    const r = await prisma.storeProduct.updateMany({
      where: { siteId: site.id, slug },
      data: { imageUrl: data.imageUrl },
    });
    if (r.count) updated++;
  }
  console.log(`[sync-product-images] ${updated} ürün görseli güncellendi`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
