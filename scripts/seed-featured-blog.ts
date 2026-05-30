/**
 * Blog görsellerini theme'e kopyalar + varsayılan blog ayarlarını veritabanına yazar.
 * Kullanım: npx tsx scripts/seed-featured-blog.ts
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { extractFeaturedBlogPostsFromHtml } from "../src/lib/mirror-featured-blog";
import { prisma } from "../src/lib/prisma";
import { parseSiteSettings, type SiteSettings } from "../src/lib/site-settings";
import type { MirrorPageConfig } from "../src/lib/mirror-home-overlay";

const BLOG_SECTION_KEY = "featured_blog_9VzA3J";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mirrorRoot =
  process.env.THEME_MIRROR_PATH?.trim() || "C:/My Web Sites/shop/theking-noor.myshopify.com";
const articlesSrc = join(mirrorRoot, "cdn/shop/articles");
const articlesDest = join(root, "public/theme/king-noor/cdn/shop/articles");

const BLOG_TR: Record<
  string,
  { titleTr: string; titleEn: string; descTr: string; descEn: string }
> = {
  "top-natural-ingredients-for-glowing-skin-you-should-try": {
    titleTr: "Parlayan Cilt İçin En İyi Doğal İçerikler",
    titleEn: "Top Natural Ingredients for Glowing Skin",
    descTr:
      "Cilt bakımı doğal, temiz ve bitki bazlı içeriklere yöneliyor. İnsanlar ciltlerine sürdükleri ürünlerin ne olduğunun daha fazla farkında...",
    descEn:
      "Skincare has taken a refreshing turn toward natural, clean, and plant-based ingredients. People are becoming more aware of what they put on their skin...",
  },
  "how-to-build-the-perfect-skincare-routine-for-your-skin-type": {
    titleTr: "Mükemmel Cilt Bakımı Rutini Oluşturun",
    titleEn: "Build the Perfect Skincare Routine",
    descTr:
      "Mükemmel cilt bakımı rutini oluşturmak önemli bir adımla başlar: Cildinizi anlamak. Kuru cilt için işe yarayan bir ürün...",
    descEn:
      "Creating the perfect skincare routine starts with one important step: Understanding your skin. What works for someone with dry skin...",
  },
  "why-hydration-is-key-for-healthy-youthful-skin": {
    titleTr: "Sağlıklı, Genç Görünümlü Cilt İçin Nemlendirme",
    titleEn: "Hydration Is Key for Healthy, Youthful Skin",
    descTr:
      "Cilt bakımında sık göz ardı edilen bir faktör nemlendirmedir. Cildiniz kuru, yağlı veya karma olsun...",
    descEn:
      "When it comes to skincare, one essential factor often overlooked is hydration. Whether your skin is dry, oily, or somewhere in between...",
  },
};

function copyArticles() {
  if (!existsSync(articlesSrc)) {
    console.warn("HTTrack articles klasörü yok:", articlesSrc);
    return 0;
  }
  mkdirSync(articlesDest, { recursive: true });
  let n = 0;
  for (const name of readdirSync(articlesSrc)) {
    const s = join(articlesSrc, name);
    if (!statSync(s).isFile()) continue;
    cpSync(s, join(articlesDest, name));
    n++;
  }
  return n;
}

async function main() {
  const copied = copyArticles();
  console.log(`[seed-featured-blog] ${copied} blog görseli kopyalandı → cdn/shop/articles`);

  const site = await prisma.storeSite.findFirst({ orderBy: { createdAt: "asc" } });
  if (!site) {
    console.error("Mağaza bulunamadı");
    process.exit(1);
  }

  const htmlPath = join(root, "public/theme/king-noor/mirror/index-tr.html");
  const html = readFileSync(htmlPath, "utf8");
  const defaults = extractFeaturedBlogPostsFromHtml(html, BLOG_SECTION_KEY);
  if (!defaults.length) {
    console.warn("featured-blog kartları bulunamadı");
    return;
  }

  const posts = defaults.map((p) => {
    const tr = BLOG_TR[p.postId];
    return {
      ...p,
      ...(tr ?? {}),
      imageUrl: p.imageUrl?.split("?")[0],
    };
  });

  const settings = parseSiteSettings(site.settingsJson);
  const home: MirrorPageConfig =
    settings.theme?.mirrorPages?.home ??
    settings.theme?.mirrorHome ?? {
      order: [],
      sections: {},
    };
  home.sections = {
    ...home.sections,
    [BLOG_SECTION_KEY]: {
      ...home.sections[BLOG_SECTION_KEY],
      featuredBlogPosts: posts,
    },
  };
  settings.theme = {
    ...settings.theme,
    mirrorPages: {
      ...settings.theme?.mirrorPages,
      home,
    },
  };

  await prisma.storeSite.update({
    where: { id: site.id },
    data: { settingsJson: JSON.stringify(settings) },
  });

  console.log(
    `[seed-featured-blog] ${posts.length} blog kartı veritabanına kaydedildi (bölüm: ${BLOG_SECTION_KEY})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
