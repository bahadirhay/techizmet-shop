import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ path: ".env.vercel.production" });

const prisma = new PrismaClient();
const rows = await prisma.storeProduct.findMany({
  where: { published: true, slug: { startsWith: "kurutulmus-" } },
  orderBy: { title: "asc" },
  select: {
    slug: true,
    imageUrl: true,
    images: { orderBy: { sortOrder: "asc" }, select: { url: true, mediaType: true } },
  },
});

function imageUrlsFromProductRow(row) {
  const urls = row.images
    .filter((i) => i.mediaType !== "video")
    .map((i) => i.url.trim())
    .filter(Boolean);
  const deduped = [...new Set(urls)];
  if (deduped.length) return deduped;
  return row.imageUrl ? [row.imageUrl] : [];
}

for (const row of rows) {
  const urls = imageUrlsFromProductRow(row);
  console.log(row.slug, "->", urls.length, urls.length > 1 ? "MULTI" : "single");
}

await prisma.$disconnect();
