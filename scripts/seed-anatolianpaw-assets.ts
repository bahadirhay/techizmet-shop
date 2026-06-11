/**
 * Anatolian Paw — public/brands/anatolianpaw görsellerini uploads + DB'ye yazar.
 *
 * Kullanım:
 *   npx tsx scripts/seed-anatolianpaw-assets.ts
 *   npx tsx scripts/seed-anatolianpaw-assets.ts --env-file=.env.anatolianpaw
 *   npx tsx scripts/seed-anatolianpaw-assets.ts --force
 */
import { config } from "dotenv";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { mergeSiteSettings } from "../src/lib/merge-site-settings";
import { anatolianPawFeatureCardsBlock } from "../src/lib/blocks/presets/anatolianpaw-feature-cards";
import { serializeBlocks } from "../src/lib/blocks/schema";
import type { ShopBlock } from "../src/lib/blocks/schema";
import type { MirrorCustomBlockEntry } from "../src/lib/mirror-custom-block-types";
import type { SiteSettings } from "../src/lib/site-settings";
import { ensureLegalCmsPages } from "../src/lib/ensure-legal-cms-pages";

const prisma = new PrismaClient();

type MediaGridItemEdit = {
  itemId: string;
  imageUrl?: string;
  headingHtml?: string;
  descriptionHtml?: string;
  linkHref?: string;
  buttonText?: string;
};

function parseSettingsJson(raw: string | null | undefined): SiteSettings {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as SiteSettings;
  } catch {
    return {};
  }
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND_DIR = join(root, "public", "brands", "anatolianpaw");

const MIRROR_MEDIA_GRID_KEY = "media_grid_bGXVTf";

function buildFeatureCardsWidget(): MirrorCustomBlockEntry {
  return {
    id: "ap-feature-cards",
    hidden: false,
    insertAfterSection: MIRROR_MEDIA_GRID_KEY,
    block: anatolianPawFeatureCardsBlock(),
  };
}

function ensureFeatureCardsWidget(
  existing: MirrorCustomBlockEntry[] | undefined,
  replace: boolean,
): MirrorCustomBlockEntry[] {
  const list = Array.isArray(existing) ? existing : [];
  const without = list.filter((e) => e.block.type !== "featureCards");
  if (!replace && list.some((e) => e.block.type === "featureCards")) return list;
  return [...without, buildFeatureCardsWidget()];
}

const HERO_SLIDES: {
  itemId: string;
  src: string;
  uploadName: string;
  headingHtml?: string;
  descriptionHtml?: string;
  linkHref?: string;
  buttonText?: string;
}[] = [
  {
    itemId: "media-grid-grid_9Y4rtz",
    src: "hero/hero-1-dog-treats.png",
    uploadName: "anatolianpaw-hero-1.png",
  },
  {
    itemId: "media-grid-grid_EK8ycA",
    src: "hero/hero-2-flatlay.png",
    uploadName: "anatolianpaw-hero-2.png",
    headingHtml:
      'Türkiye\'de Üretilen <span class="markers-text accent-font no-markers">Doğal Köpek Ödülleri</span>',
    descriptionHtml:
      "Katkısız, %100 doğal kurutulmuş ödül mamalarıyla sevimli dostlarınızın yanında.",
    linkHref: "/collections/all",
    buttonText: "Keşfet",
  },
  {
    itemId: "media-grid-grid_8hNLzz",
    src: "hero/hero-3-lifestyle.png",
    uploadName: "anatolianpaw-hero-3.png",
  },
  {
    itemId: "media-grid-grid_egYQBA",
    src: "hero/hero-2-flatlay.png",
    uploadName: "anatolianpaw-hero-4.png",
  },
];

const PRODUCTS = [
  {
    slug: "kurutulmus-deve-derisi",
    title: "Kurutulmuş Deve Derisi",
    description:
      "Uzun süre çiğneme keyfi sunan, diş sağlığına katkılı doğal deve derisi. Yüksek protein, düşük yağ.",
    image: "products/kurutulmus-deve-derisi.png",
    uploadName: "anatolianpaw-deve-derisi.png",
  },
  {
    slug: "kurutulmus-dana-girtlak",
    title: "Kurutulmuş Dana Gırtlak",
    description:
      "Kıkırdak yapısıyla eklem sağlığını destekleyen, çıtır çıtır lezzetli dana gırtlak.",
    image: "products/kurutulmus-dana-girtlak.png",
    uploadName: "anatolianpaw-dana-girtlak.png",
  },
  {
    slug: "kurutulmus-kuzu-paca",
    title: "Kurutulmuş Kuzu Paça",
    description: "Kolajen deposu kuzu paça, tüy ve cilt sağlığı için mükemmel bir seçenek.",
    image: "products/kurutulmus-kuzu-paca.png",
    uploadName: "anatolianpaw-kuzu-paca.png",
  },
  {
    slug: "kurutulmus-tavuk-ayagi",
    title: "Kurutulmuş Tavuk Ayağı",
    description:
      "Eklem sağlığını destekleyen glukozamin açısından zengin, çıtır tavuk ayağı.",
    image: "products/kurutulmus-tavuk-ayagi.png",
    uploadName: "anatolianpaw-tavuk-ayagi.png",
  },
  {
    slug: "kurutulmus-dana-akciger",
    title: "Kurutulmuş Dana Akciğer",
    description:
      "Hafif ve çıtır yapısıyla her yaş ve büyüklükteki köpek için ideal eğitim ödülü.",
    image: "products/kurutulmus-dana-akciger.png",
    uploadName: "anatolianpaw-dana-akciger.png",
  },
] as const;

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

function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".webp") return "image/webp";
  if (e === ".gif") return "image/gif";
  if (e === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

async function ensureAssetFile(siteId: string, relSrc: string, uploadName: string) {
  const srcPath = join(BRAND_DIR, relSrc);
  if (!existsSync(srcPath)) {
    throw new Error(`Görsel bulunamadı: ${srcPath}`);
  }

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
    return url;
  }

  await prisma.storeMedia.create({
    data: { siteId, filename: uploadName, url, mimeType, sizeBytes },
  });
  return url;
}

function buildHomeBlocks(heroUrls: string[]): string {
  const slides = [
    {
      id: "hero-1",
      imageUrl: heroUrls[0],
      headline: "Türkiye'de Üretilen, Avrupa'da Sevilen Doğal Köpek Ödülleri",
      subline: "Katkısız, %100 doğal kurutulmuş ödül mamaları.",
      ctaLabel: "Ürünleri keşfet",
      ctaHref: "/collections/all",
    },
    {
      id: "hero-2",
      imageUrl: heroUrls[1],
      headline: "%100 Doğal",
      subline: "Hiçbir katkı maddesi, koruyucu veya yapay lezzet yok.",
      ctaLabel: "Mağazaya git",
      ctaHref: "/collections/all",
    },
    {
      id: "hero-3",
      imageUrl: heroUrls[2],
      headline: "Avrupa Kalitesi, Türkiye'de",
      subline: "Yıllardır Avrupa'ya ihracat yapan aynı kalite.",
      ctaLabel: "Keşfet",
      ctaHref: "/collections/all",
    },
  ];

  const blocks: ShopBlock[] = [
    { type: "heroSlider", props: { autoplayMs: 6000, slides } },
    {
      type: "text",
      props: {
        as: "h2",
        align: "center",
        content: "Neden Anatolian Paw?",
      },
    },
    {
      type: "text",
      props: {
        align: "center",
        content:
          "Köpeklerinizin sağlığı bizim için öncelik. Her ürünümüz özenle seçilmiş doğal malzemelerden üretilir.",
      },
    },
    {
      type: "productGrid",
      props: { title: "Ürünlerimiz", limit: 8 },
    },
  ];

  return serializeBlocks(blocks);
}

export async function seedAnatolianPawAssets(opts?: { slug?: string; force?: boolean }) {
  const slug = (opts?.slug ?? process.env.STORE_SITE_SLUG ?? "anatolianpaw").trim();
  const force = opts?.force ?? process.argv.includes("--force");

  const site = await prisma.storeSite.findUnique({ where: { slug } });
  if (!site) throw new Error(`Mağaza bulunamadı: slug="${slug}"`);

  console.log(`[seed-anatolianpaw] site: ${site.name} (${site.id})`);

  const logoDark = await ensureAssetFile(site.id, "logo-header.png", "anatolianpaw-logo-dark.png");
  const logoLight = await ensureAssetFile(
    site.id,
    "logo-header-light.png",
    "anatolianpaw-logo-light.png",
  );
  const favicon = await ensureAssetFile(site.id, "favicon.png", "anatolianpaw-favicon.png");
  const ogImage = await ensureAssetFile(site.id, "social/og-share.png", "anatolianpaw-og.png");
  const categoryBanner = await ensureAssetFile(
    site.id,
    "category-banner.png",
    "anatolianpaw-category-banner.png",
  );

  const heroUrls: string[] = [];
  const mediaGridItems: MediaGridItemEdit[] = [];

  for (const slide of HERO_SLIDES) {
    const imageUrl = await ensureAssetFile(site.id, slide.src, slide.uploadName);
    heroUrls.push(imageUrl);
    mediaGridItems.push({
      itemId: slide.itemId,
      imageUrl,
      headingHtml: slide.headingHtml,
      descriptionHtml: slide.descriptionHtml,
      linkHref: slide.linkHref,
      buttonText: slide.buttonText,
    });
  }

  const current = parseSettingsJson(site.settingsJson);
  const existingHome = current.theme?.mirrorPages?.home ?? current.theme?.mirrorHome;
  const prevMediaGrid = existingHome?.sections?.[MIRROR_MEDIA_GRID_KEY] ?? {};
  const {
    mediaGridLayout: _removedLayout,
    mediaGridFeatureRow: _removedFeatureRow,
    mediaGridItems: _removedItems,
    ...restMediaGrid
  } = prevMediaGrid as Record<string, unknown>;

  const heroImageElements: Record<string, { id: string; kind: "image"; imageUrl: string }> = {};
  for (const slide of HERO_SLIDES) {
    const item = mediaGridItems.find((i) => i.itemId === slide.itemId);
    if (item?.imageUrl) {
      heroImageElements[`${slide.itemId}--img`] = {
        id: `${slide.itemId}--img`,
        kind: "image",
        imageUrl: item.imageUrl,
      };
    }
  }

  const settings = mergeSiteSettings(current, {
    branding: {
      logoUrl: logoDark,
      logoUrlLight: logoLight,
      faviconUrl: favicon,
    },
    seo: {
      siteTitle: "Anatolian Paw",
      metaDescription:
        "Türkiye'de üretilen, Avrupa'da sevilen %100 doğal kurutulmuş köpek ödül mamaları.",
      ogImageUrl: ogImage,
      robotsIndex: true,
    },
    theme: {
      homepageMode: "mirror",
      mirrorPages: {
        home: {
          order: existingHome?.order ?? [],
          sections: {
            ...existingHome?.sections,
            [MIRROR_MEDIA_GRID_KEY]: {
              ...restMediaGrid,
              mediaGridItems,
              autoplayMs: 6000,
            },
          },
          elements: { ...existingHome?.elements, ...heroImageElements },
          customBlocks: ensureFeatureCardsWidget(existingHome?.customBlocks, force),
        },
      },
    },
  });

  await prisma.storeSite.update({
    where: { id: site.id },
    data: { settingsJson: JSON.stringify(settings) },
  });

  const homePage = await prisma.shopPage.findUnique({
    where: { siteId_slug: { siteId: site.id, slug: "home" } },
  });
  if (homePage) {
    await prisma.shopPage.update({
      where: { id: homePage.id },
      data: { blocks: buildHomeBlocks(heroUrls) },
    });
  }

  const categorySlug = "dogal-kopek-odulleri";
  let category = await prisma.storeCategory.findUnique({
    where: { siteId_slug: { siteId: site.id, slug: categorySlug } },
  });

  if (!category) {
    category = await prisma.storeCategory.create({
      data: {
        siteId: site.id,
        title: "Doğal Köpek Ödülleri",
        slug: categorySlug,
        description: "Katkısız, %100 doğal kurutulmuş köpek ödül mamaları.",
        imageUrl: categoryBanner,
        sortOrder: 0,
        active: true,
      },
    });
    console.log(`[seed-anatolianpaw] kategori oluşturuldu: ${category.title}`);
  } else if (force || !category.imageUrl) {
    category = await prisma.storeCategory.update({
      where: { id: category.id },
      data: { imageUrl: categoryBanner },
    });
    console.log(`[seed-anatolianpaw] kategori güncellendi: ${category.title}`);
  } else {
    console.log(`[seed-anatolianpaw] kategori atlandı (mevcut): ${category.title}`);
  }

  let productsCreated = 0;
  let productsUpdated = 0;
  let productsSkipped = 0;

  for (const p of PRODUCTS) {
    const imageUrl = await ensureAssetFile(site.id, p.image, p.uploadName);
    const existing = await prisma.storeProduct.findUnique({
      where: { siteId_slug: { siteId: site.id, slug: p.slug } },
      include: { images: true },
    });

    if (existing && !force) {
      productsSkipped++;
      continue;
    }

    if (existing && force) {
      await prisma.storeProductImage.deleteMany({ where: { productId: existing.id } });
      await prisma.storeProduct.update({
        where: { id: existing.id },
        data: {
          title: p.title,
          description: p.description,
          imageUrl,
          categoryId: category.id,
          images: {
            create: [{ url: imageUrl, mediaType: "image", sortOrder: 0, alt: p.title }],
          },
        },
      });
      await prisma.storeProductCategory.upsert({
        where: {
          productId_categoryId: { productId: existing.id, categoryId: category.id },
        },
        create: { productId: existing.id, categoryId: category.id, sortOrder: 0 },
        update: { sortOrder: 0 },
      });
      productsUpdated++;
      continue;
    }

    const created = await prisma.storeProduct.create({
      data: {
        siteId: site.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        imageUrl,
        categoryId: category.id,
        priceMinor: 0,
        stockQty: 0,
        published: true,
        images: {
          create: [{ url: imageUrl, mediaType: "image", sortOrder: 0, alt: p.title }],
        },
        categoryLinks: {
          create: [{ categoryId: category.id, sortOrder: 0 }],
        },
      },
    });
    productsCreated++;
    console.log(`  + ürün: ${created.title}`);
  }

  await ensureLegalCmsPages(site.id);

  return {
    siteId: site.id,
    slug,
    branding: { logoDark, logoLight, favicon, ogImage },
    heroUrls,
    categoryId: category.id,
    productsCreated,
    productsUpdated,
    productsSkipped,
  };
}

async function main() {
  loadEnvFile();
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL tanımlı değil (--env-file ile .env.anatolianpaw verin).");
  }

  const result = await seedAnatolianPawAssets();
  console.log("");
  console.log("=== Anatolian Paw görselleri yüklendi ===");
  console.log(`  Site          : ${result.slug} (${result.siteId})`);
  console.log(`  Logo (koyu)   : ${result.branding.logoDark}`);
  console.log(`  Logo (açık)   : ${result.branding.logoLight}`);
  console.log(`  Favicon       : ${result.branding.favicon}`);
  console.log(`  OG görsel     : ${result.branding.ogImage}`);
  console.log(`  Hero görselleri : ${result.heroUrls.length} (mirror media-grid)`);
  console.log(
    `  Ürünler       : +${result.productsCreated} yeni, ${result.productsUpdated} güncellendi, ${result.productsSkipped} atlandı`,
  );
  console.log("");
  console.log("Sonraki adımlar:");
  console.log("  1. npm run dev -- -p 5556  →  http://localhost:5556");
  console.log("  2. Admin → fiyat/stok girin, mirror vitrin metinlerini inceleyin");
  console.log("  3. Gerçek ürün fotoğraflarıyla AI görselleri değiştirin");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
