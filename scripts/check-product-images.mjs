#!/usr/bin/env node
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();
const slug = process.argv[2] || "creamy-foundation-for-all-skin-types";

const sites = await prisma.storeSite.findMany({ select: { id: true, slug: true } });
console.log("sites:", sites);

for (const site of sites) {
  const product = await prisma.storeProduct.findFirst({
    where: { siteId: site.id, slug },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!product) {
    console.log(`[${site.slug}] ürün yok`);
    continue;
  }
  console.log(`[${site.slug}] id=${product.id} images=${product.images.length} imageUrl=${product.imageUrl}`);
}

await prisma.$disconnect();
