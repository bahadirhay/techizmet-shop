/**
 * Anatolian Paw blog — anatolianpaw.com/blog.html içeriklerini DB + vitrin'e yazar.
 *
 * Kullanım:
 *   npx tsx scripts/seed-anatolianpaw-blog.ts --env-file=.env.anatolianpaw
 *   npm run store:seed:anatolianpaw:blog
 */
import { config } from "dotenv";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import { mergeSiteSettings } from "../src/lib/merge-site-settings";
import { blogPostsToFeaturedEdits } from "../src/lib/blog/mirror-blog-inject";
import { FEATURED_BLOG_SECTION_KEY } from "../src/lib/mirror-featured-blog";
import {
  reassembleBlogItemHtml,
  splitBlogItemHtmlParts,
} from "../src/lib/mirror-blog-item-html";
import type { SiteSettings } from "../src/lib/site-settings";

const prisma = new PrismaClient();
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND_BLOG_DIR = join(root, "public", "brands", "anatolianpaw", "blog");
const MIRROR_BLOG_DIR = join(root, "public", "theme", "techizmet-shop", "mirror", "blogs", "news");
const BLOG_TEMPLATE_SLUG = "how-to-build-the-perfect-skincare-routine-for-your-skin-type";
const FEATURED_HOME_COUNT = 3;

type PostMeta = {
  slug: string;
  sourcePath: string;
  category: string;
  emoji: string;
  color: string;
  excerpt: string;
  featuredOnHome?: boolean;
};

const POSTS: PostMeta[] = [
  {
    slug: "kopek-odul-mamasi-nasil-secilir",
    sourcePath: "blog/kopek-odul-mamasi-nasil-secilir.html",
    category: "Beslenme",
    emoji: "🦴",
    color: "#8B6F47",
    excerpt:
      "Doğal ve katkısız ödül mamalarının farkları, içerik etiketlerini okuma rehberi ve köpeğiniz için en iyi seçimi yapma yöntemleri.",
    featuredOnHome: true,
  },
  {
    slug: "yavru-kopeklere-odul-mamasi",
    sourcePath: "blog/yavru-kopeklere-odul-mamasi.html",
    category: "Yavru Köpekler",
    emoji: "🐕",
    color: "#6B8E6B",
    excerpt:
      "Yavru köpeklerin gelişim evreleri, ödül mamasına başlama zamanı, dozaj hesaplama ve sağlıklı beslenme için ipuçları.",
    featuredOnHome: true,
  },
  {
    slug: "kopek-odul-mamasi-gunluk-kalori",
    sourcePath: "blog/kopek-odul-mamasi-gunluk-kalori.html",
    category: "Sağlık",
    emoji: "⚖️",
    color: "#5B7C99",
    excerpt:
      "Köpeklerde obeziteyi önlemek için ödül maması kalori hesaplama rehberi, pratik ipuçları ve veteriner önerileri.",
    featuredOnHome: true,
  },
  {
    slug: "kopek-tuvalet-egitimi-odul",
    sourcePath: "blog/kopek-tuvalet-egitimi-odul.html",
    category: "Eğitim",
    emoji: "🏠",
    color: "#9B7E5A",
    excerpt:
      "Adım adım tuvalet eğitimi rehberi, ödül zamanlaması, en sık yapılan hatalar ve başarı hikayeleri.",
  },
  {
    slug: "freeze-dried-odul-mamasi",
    sourcePath: "blog/freeze-dried-odul-mamasi.html",
    category: "Ürün Bilgisi",
    emoji: "❄️",
    color: "#7BA7C9",
    excerpt:
      "Dondurarak kurutma teknolojisi, besin değerlerini koruma, raf ömrü ve geleneksel kurutma yöntemleriyle karşılaştırma.",
  },
  {
    slug: "kopek-dis-sagligi-kemik",
    sourcePath: "blog/kopek-dis-sagligi-kemik.html",
    category: "Sağlık",
    emoji: "🦷",
    color: "#8A9A7B",
    excerpt:
      "Diş taşı önleme, doğru kemik seçimi, çiğneme süreleri ve köpeğinizin ağız sağlığını koruma rehberi.",
  },
  {
    slug: "ev-yapimi-kopek-odulu",
    sourcePath: "blog/ev-yapimi-kopek-odulu.html",
    category: "DIY",
    emoji: "🌿",
    color: "#6F8F72",
    excerpt:
      "Evde güvenle hazırlayabileceğiniz katkısız tarifler, saklanma süreleri ve yapmamanız gereken malzemeler listesi.",
  },
  {
    slug: "kopek-egitimi-odul-zamanlama",
    sourcePath: "blog/kopek-egitimi-odul-zamanlama.html",
    category: "Eğitim",
    emoji: "⏱️",
    color: "#A67C52",
    excerpt:
      "En sık yapılan 5 hata, doğru zamanlama teknikleri ve davranış pekiştirme bilimi.",
  },
  {
    slug: "alerjik-kopek-odul-mamasi",
    sourcePath: "blog/alerjik-kopek-odul-mamasi.html",
    category: "Özel İhtiyaçlar",
    emoji: "🔴",
    color: "#B85C5C",
    excerpt:
      "Tek protein kaynaklı ürünler, tahılsız seçenekler, alerjen-free ödüller ve güvenli malzeme rehberi.",
  },
];

function argValue(flag: string): string | undefined {
  const hit = process.argv.find((a) => a === flag || a.startsWith(`${flag}=`));
  if (!hit) return undefined;
  if (hit.includes("=")) return hit.slice(hit.indexOf("=") + 1).trim() || undefined;
  const i = process.argv.indexOf(hit);
  return process.argv[i + 1]?.trim();
}

function loadEnvFile() {
  const envFile = argValue("--env-file") ?? ".env";
  config({ path: resolve(root, envFile) });
  config({ path: resolve(root, ".env.local"), override: true });
}

function parseSettingsJson(raw: string | null | undefined): SiteSettings {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as SiteSettings;
  } catch {
    return {};
  }
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapSvgLine(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxLen && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

async function generateBlogCover(meta: PostMeta, title: string, outPath: string) {
  const lines = wrapSvgLine(title, 28);
  const lineEls = lines
    .map((line, i) => {
      const y = 560 + i * 42;
      return `<text x="590" y="${y}" font-size="34" font-family="Arial, Helvetica, sans-serif" fill="#2D2D2D" text-anchor="middle">${escapeXml(line)}</text>`;
    })
    .join("\n");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1180" height="760" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${meta.color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F5F1E8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1180" height="760" fill="url(#g)" rx="24"/>
  <circle cx="590" cy="280" r="120" fill="rgba(255,255,255,0.35)"/>
  <text x="590" y="310" font-size="110" text-anchor="middle">${meta.emoji}</text>
  ${lineEls}
  <text x="590" y="700" font-size="26" font-family="Arial, Helvetica, sans-serif" fill="#6B6B6B" text-anchor="middle">${escapeXml(meta.category)} · Anatolian Paw</text>
</svg>`;

  mkdirSync(dirname(outPath), { recursive: true });
  await sharp(Buffer.from(svg, "utf8")).png().toFile(outPath);
}

function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".webp") return "image/webp";
  return "image/jpeg";
}

async function ensureUploadedImage(siteId: string, srcPath: string, uploadName: string) {
  const relDir = join("uploads", "shop", siteId);
  const absDir = join(root, "public", relDir);
  mkdirSync(absDir, { recursive: true });
  const absFile = join(absDir, uploadName);
  copyFileSync(srcPath, absFile);
  const url = `/${relDir.replace(/\\/g, "/")}/${uploadName}`;
  const sizeBytes = statSync(absFile).size;
  const mimeType = mimeFromExt(extname(uploadName));
  const existing = await prisma.storeMedia.findFirst({
    where: { siteId, OR: [{ url }, { filename: uploadName }] },
  });
  if (existing) {
    await prisma.storeMedia.update({
      where: { id: existing.id },
      data: { url, filename: uploadName, mimeType, sizeBytes },
    });
  } else {
    await prisma.storeMedia.create({
      data: { siteId, filename: uploadName, url, mimeType, sizeBytes },
    });
  }
  return url;
}

async function fetchArticle(sourcePath: string) {
  const url = `https://anatolianpaw.com/${sourcePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("utf8");
}

function parseArticleHtml(html: string) {
  const title =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
  const seoDescription =
    html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]?.trim() ?? "";
  const seoTitle = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.split("|")[0]?.trim() ?? title;

  let body = html.match(/<article[^>]*class="article"[^>]*>([\s\S]*?)<\/article>/i)?.[1] ?? "";
  body = body.replace(/<div class="meta"[^>]*>[\s\S]*?<\/div>/i, "");
  body = body.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, "");
  body = body.replace(/<div class="cta-box">[\s\S]*?<\/div>/gi, "");
  body = body
    .replace(/href="\.\.\/index\.html"/gi, 'href="/collections/all"')
    .replace(/href="\.\.\/products\.html"/gi, 'href="/collections/all"')
    .replace(/href="\.\.\/blog\.html"/gi, 'href="/blogs/news"')
    .replace(/class="highlight-box"/g, 'class="highlight-box" style="background:#F5F1E8;padding:1rem;border-radius:8px;margin:1rem 0"')
    .replace(/class="tip"/g, 'class="tip" style="background:#e8f5e9;padding:1rem;border-radius:8px;margin:1rem 0"')
    .replace(/class="warning"/g, 'class="warning" style="background:#fff3cd;padding:1rem;border-radius:8px;margin:1rem 0"')
    .trim();

  return { title, seoTitle, seoDescription, body };
}

/** Eski seed klonları — statik skincare HTML, DB enjeksiyonunu engeller */
function removeClonedBlogArticleFiles() {
  let removed = 0;
  for (const meta of POSTS) {
    for (const suffix of ["", "-tr"]) {
      const p = join(MIRROR_BLOG_DIR, `${meta.slug}${suffix}.html`);
      if (!existsSync(p)) continue;
      try {
        unlinkSync(p);
        removed++;
      } catch {
        /* ignore */
      }
    }
  }
  if (removed) console.log(`[seed-blog] ${removed} klon makale dosyası silindi`);
}

function expandBlogIndexToCount(html: string, targetCount: number) {
  const { prefix, items, suffix } = splitBlogItemHtmlParts(html);
  if (!items.length || items.length >= targetCount) return html;
  const template = items[items.length - 1]!;
  while (items.length < targetCount) {
    items.push(template);
  }
  return reassembleBlogItemHtml(prefix, items, suffix);
}

function updateBlogIndexMirrorFiles(targetCount: number) {
  for (const name of ["index.html", "index-tr.html"]) {
    const path = join(MIRROR_BLOG_DIR, name);
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf8");
    const next = expandBlogIndexToCount(raw, targetCount);
    if (next !== raw) {
      writeFileSync(path, next, "utf8");
      console.log(`[seed-blog] ${name} → ${targetCount} kart`);
    }
  }
}

async function unpublishLegacySkincarePosts(siteId: string, keepSlugs: Set<string>) {
  const legacy = await prisma.storeBlogPost.findMany({
    where: { siteId, slug: { notIn: [...keepSlugs] } },
    select: { id: true, slug: true },
  });
  if (!legacy.length) return;
  await prisma.storeBlogPost.updateMany({
    where: { id: { in: legacy.map((p) => p.id) } },
    data: { published: false, featuredOnHome: false },
  });
  console.log(`[seed-blog] ${legacy.length} eski yazı yayından kaldırıldı`);
}

export async function seedAnatolianPawBlog(opts?: { slug?: string; force?: boolean }) {
  const slug = (opts?.slug ?? process.env.STORE_SITE_SLUG ?? "anatolianpaw").trim();
  const force = opts?.force ?? process.argv.includes("--force");

  const site = await prisma.storeSite.findUnique({ where: { slug } });
  if (!site) throw new Error(`Mağaza bulunamadı: slug="${slug}"`);

  mkdirSync(BRAND_BLOG_DIR, { recursive: true });
  removeClonedBlogArticleFiles();
  updateBlogIndexMirrorFiles(POSTS.length);

  const keepSlugs = new Set(POSTS.map((p) => p.slug));
  await unpublishLegacySkincarePosts(site.id, keepSlugs);

  const publishedAt = new Date("2026-02-12T10:00:00+03:00");
  const author = "Anatolian Paw";

  for (let i = 0; i < POSTS.length; i++) {
    const meta = POSTS[i]!;
    console.log(`[seed-blog] çekiliyor: ${meta.slug}`);
    const html = await fetchArticle(meta.sourcePath);
    const parsed = parseArticleHtml(html);
    const title = parsed.title || meta.slug;
    const coverName = `anatolianpaw-blog-${meta.slug}.png`;
    const coverBrandPath = join(BRAND_BLOG_DIR, coverName);
    if (!existsSync(coverBrandPath) || force) {
      await generateBlogCover(meta, title, coverBrandPath);
    }
    const imageUrl = await ensureUploadedImage(site.id, coverBrandPath, coverName);

    await prisma.storeBlogPost.upsert({
      where: { siteId_slug: { siteId: site.id, slug: meta.slug } },
      create: {
        siteId: site.id,
        slug: meta.slug,
        titleTr: title,
        titleEn: title,
        excerptTr: meta.excerpt,
        excerptEn: meta.excerpt,
        bodyTr: parsed.body,
        bodyEn: parsed.body,
        imageUrl,
        author,
        publishedAt,
        published: true,
        featuredOnHome: meta.featuredOnHome === true,
        sortOrder: i,
        seoTitle: parsed.seoTitle || title,
        seoDescription: parsed.seoDescription || meta.excerpt,
      },
      update: {
        titleTr: title,
        titleEn: title,
        excerptTr: meta.excerpt,
        excerptEn: meta.excerpt,
        bodyTr: parsed.body,
        bodyEn: parsed.body,
        imageUrl,
        author,
        publishedAt,
        published: true,
        featuredOnHome: meta.featuredOnHome === true,
        sortOrder: i,
        seoTitle: parsed.seoTitle || title,
        seoDescription: parsed.seoDescription || meta.excerpt,
      },
    });
    console.log(`[seed-blog] ✓ ${meta.slug}`);
  }

  const featuredRows = await prisma.storeBlogPost.findMany({
    where: { siteId: site.id, published: true, featuredOnHome: true },
    orderBy: [{ sortOrder: "asc" }],
    take: FEATURED_HOME_COUNT,
    select: {
      slug: true,
      titleTr: true,
      titleEn: true,
      excerptTr: true,
      excerptEn: true,
      imageUrl: true,
      author: true,
      publishedAt: true,
      bodyTr: true,
      bodyEn: true,
      published: true,
      featuredOnHome: true,
      sortOrder: true,
      seoTitle: true,
      seoDescription: true,
      id: true,
    },
  });

  const featuredEdits = blogPostsToFeaturedEdits(featuredRows, "tr");
  const current = parseSettingsJson(site.settingsJson);
  const existingHome = current.theme?.mirrorPages?.home ?? current.theme?.mirrorHome;
  const existingBlogNews = current.theme?.mirrorPages?.["blog-news"];

  const settings = mergeSiteSettings(current, {
    seo: {
      metaDescription:
        "Türkiye'de üretilen, Avrupa'da sevilen %100 doğal kurutulmuş köpek ödül mamaları. Beslenme, eğitim ve sağlık rehberleri.",
    },
    theme: {
      mirrorPages: {
        home: {
          order: existingHome?.order,
          sections: {
            ...existingHome?.sections,
            [FEATURED_BLOG_SECTION_KEY]: {
              ...(existingHome?.sections?.[FEATURED_BLOG_SECTION_KEY] ?? {}),
              headingHtml:
                'Köpek Bakımı Rehberi <span class="markers-text accent-font no-markers">Uzman Tavsiyeleri</span>',
              featuredBlogPosts: featuredEdits,
            },
          },
          elements: {
            ...existingHome?.elements,
            "featured_blog_9VzA3J--section--heading--0": {
              id: "featured_blog_9VzA3J--section--heading--0",
              kind: "html",
              html: 'Köpek Bakımı Rehberi <span class="markers-text accent-font no-markers">Uzman Tavsiyeleri</span>',
            },
            "featured_blog_9VzA3J--section--description--0": {
              id: "featured_blog_9VzA3J--section--description--0",
              kind: "text",
              text: "Sevimli dostlarınız için uzman tavsiyeleri, beslenme ipuçları ve eğitim rehberleri.",
            },
            "featured_blog_9VzA3J--button-text--0": {
              id: "featured_blog_9VzA3J--button-text--0",
              kind: "text",
              text: "Tüm Yazılar",
            },
          },
        },
        "blog-news": {
          order: existingBlogNews?.order,
          elements: {
            ...existingBlogNews?.elements,
            "page_banner_LbAPda--banner-title": {
              id: "page_banner_LbAPda--banner-title",
              kind: "text",
              text: "Köpek Bakımı Rehberi",
            },
            "page_banner_LbAPda--banner-desc": {
              id: "page_banner_LbAPda--banner-desc",
              kind: "text",
              text: "Sevimli dostlarınız için uzman tavsiyeleri, beslenme ipuçları ve eğitim rehberleri.",
            },
          },
        },
      },
    },
  });

  await prisma.storeSite.update({
    where: { id: site.id },
    data: { settingsJson: JSON.stringify(settings) },
  });

  return {
    siteId: site.id,
    slug,
    postCount: POSTS.length,
    featuredCount: featuredRows.length,
  };
}

async function main() {
  loadEnvFile();
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL tanımlı değil (--env-file=.env.anatolianpaw kullanın).");
  }

  const result = await seedAnatolianPawBlog();
  console.log("");
  console.log("=== Anatolian Paw blog yüklendi ===");
  console.log(`  Site       : ${result.slug} (${result.siteId})`);
  console.log(`  Yazılar    : ${result.postCount}`);
  console.log(`  Ana sayfa  : ${result.featuredCount} öne çıkan kart`);
  console.log("");
  console.log("Kontrol:");
  console.log("  http://localhost:5556/blogs/news");
  console.log("  http://localhost:5556/blogs/news/kopek-odul-mamasi-nasil-secilir");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
