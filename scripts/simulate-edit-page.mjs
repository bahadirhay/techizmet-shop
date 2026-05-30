#!/usr/bin/env node
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();
const id = "cmpguuajm001sui1c6s72fdy4";
const siteId = "cmpgkh1vm0000uiignkqo8dfw";

const product = await prisma.storeProduct.findFirst({
  where: { id, siteId },
  select: {
    id: true,
    title: true,
    slug: true,
    imageUrl: true,
    images: { orderBy: { sortOrder: "asc" }, select: { url: true, sortOrder: true } },
  },
});

const urls = product?.images?.length
  ? product.images.sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.url)
  : product?.imageUrl
    ? [product.imageUrl]
    : [];

console.log(JSON.stringify({ product, urls }, null, 2));
await prisma.$disconnect();
