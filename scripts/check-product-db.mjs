#!/usr/bin/env node
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();
const slug = process.argv[2] || "creamy-foundation-for-all-skin-types";

const product = await prisma.storeProduct.findFirst({
  where: { slug },
  select: {
    id: true,
    slug: true,
    title: true,
    description: true,
    descriptionHtml: true,
    keyFeaturesHtml: true,
    howToUseHtml: true,
  },
});
console.log(JSON.stringify(product, null, 2));
await prisma.$disconnect();
