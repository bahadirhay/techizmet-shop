/**
 * Mirror blog HTML → veritabanı (StoreBlogPost)
 * Kullanım: npx tsx scripts/import-blog-posts-from-mirror.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractBlogPostFromMirrorHtml } from "../src/lib/blog/mirror-blog-inject";
import { prisma } from "../src/lib/prisma";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const blogDir = join(root, "public/theme/king-noor/mirror/blogs/news");

async function main() {
  const site = await prisma.storeSite.findFirst({ orderBy: { createdAt: "asc" } });
  if (!site) {
    console.error("Mağaza bulunamadı");
    process.exit(1);
  }

  let n = 0;
  for (const name of readdirSync(blogDir)) {
    if (!name.endsWith(".html") || name.endsWith("-tr.html")) continue;
    if (name === "index.html" || name === "index-tr.html") continue;

    const slug = name.replace(/\.html$/i, "");
    if (slug === "POST" || slug.length < 3) continue;
    const html = readFileSync(join(blogDir, name), "utf8");
    const extracted = extractBlogPostFromMirrorHtml(html, slug);

    let publishedAt: Date | null = null;
    if (extracted.dateLabel) {
      const d = new Date(extracted.dateLabel);
      if (!Number.isNaN(d.getTime())) publishedAt = d;
    }

    await prisma.storeBlogPost.upsert({
      where: { siteId_slug: { siteId: site.id, slug } },
      create: {
        siteId: site.id,
        slug,
        titleTr: extracted.title,
        titleEn: extracted.title,
        excerptTr: extracted.excerpt,
        excerptEn: extracted.excerpt,
        bodyTr: extracted.bodyTr,
        bodyEn: extracted.bodyTr,
        imageUrl: extracted.imageUrl,
        author: extracted.author,
        publishedAt: publishedAt ?? new Date(),
        published: true,
        featuredOnHome: [
          "how-to-build-the-perfect-skincare-routine-for-your-skin-type",
          "top-natural-ingredients-for-glowing-skin-you-should-try",
          "why-hydration-is-key-for-healthy-youthful-skin",
        ].includes(slug),
        sortOrder: n,
      },
      update: {
        titleTr: extracted.title,
        excerptTr: extracted.excerpt,
        bodyTr: extracted.bodyTr,
        imageUrl: extracted.imageUrl,
        author: extracted.author,
      },
    });
    console.log(`[blog:import] ${slug}`);
    n++;
  }

  console.log(`[blog:import] ${n} yazı → site ${site.slug}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
