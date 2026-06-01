/**
 * Blog kapak görsellerini mirror HTML → store_blog_post.image_url
 * npx tsx scripts/sync-blog-images.ts
 */
import { config } from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { resolveBlogFeaturedImageUrl } from "../src/lib/mirror-blog-images-server";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();
const blogDir = join(process.cwd(), "public/theme/techizmet-shop/mirror/blogs/news");

async function main() {
  const site = await prisma.storeSite.findFirst({ where: { slug: "demo" } });
  if (!site) throw new Error("demo site yok");

  let ok = 0;
  let skip = 0;
  for (const name of readdirSync(blogDir)) {
    if (!name.endsWith(".html") || name.endsWith("-tr.html")) continue;
    if (name === "index.html" || name === "POST.html") continue;

    const slug = name.replace(/\.html$/i, "");
    const imageUrl = resolveBlogFeaturedImageUrl(slug);
    if (!imageUrl?.trim()) {
      console.warn(`[skip] ${slug}: görsel yok`);
      skip++;
      continue;
    }

    const post = await prisma.storeBlogPost.findFirst({ where: { siteId: site.id, slug } });
    if (!post) {
      console.warn(`[skip] ${slug}: DB yazısı yok`);
      skip++;
      continue;
    }

    if (post.imageUrl === imageUrl) {
      skip++;
      continue;
    }

    await prisma.storeBlogPost.update({
      where: { id: post.id },
      data: { imageUrl },
    });
    ok++;
    console.log(`[ok] ${slug} → ${imageUrl}`);
  }

  console.log(`[sync-blog-images] ${ok} güncellendi, ${skip} atlandı`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
