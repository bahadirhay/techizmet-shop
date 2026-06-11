import "server-only";

import { parseBlocks, type ShopBlock } from "@/lib/blocks/schema";
import { buildImageAltText } from "@/lib/admin/site-seo/content-builders";
import type { SiteSeoPageRecord } from "@/lib/admin/site-seo/types";
import { getSiteBranding, getSiteSeo } from "@/lib/site-settings";
import type { SiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

function firstImageFromBlocks(blocks: ShopBlock[]): string | null {
  for (const block of blocks) {
    if (block.type === "image" && block.props.src?.trim()) return block.props.src.trim();
    if (block.type === "heroSlider") {
      const slide = block.props.slides.find((s) => s.imageUrl?.trim());
      if (slide?.imageUrl?.trim()) return slide.imageUrl.trim();
    }
    if (block.type === "imageTextSplit" && block.props.imageUrl?.trim()) {
      return block.props.imageUrl.trim();
    }
  }
  return null;
}

function applyStaticOverlay(
  page: SiteSeoPageRecord,
  staticPages: Record<string, { seoTitle?: string; seoDescription?: string; imageAlt?: string; imageUrl?: string }>,
  defaultOgImage: string | null,
): SiteSeoPageRecord {
  const overlay = staticPages[page.path];
  const imageUrl = overlay?.imageUrl?.trim() || page.imageUrl?.trim() || defaultOgImage || null;
  return {
    ...page,
    seoTitle: overlay?.seoTitle?.trim() || page.seoTitle,
    seoDescription: overlay?.seoDescription?.trim() || page.seoDescription,
    imageAlt: overlay?.imageAlt?.trim() || page.imageAlt,
    imageUrl,
  };
}

export async function loadSiteSeoPages(
  siteId: string,
  siteName: string,
  settings: SiteSettings,
): Promise<SiteSeoPageRecord[]> {
  const seo = getSiteSeo(settings, siteName);
  const staticPages = seo.staticPages ?? {};
  const branding = getSiteBranding(settings);
  const defaultOg = seo.ogImageUrl?.trim() || branding.logoUrl?.trim() || null;
  const pages: SiteSeoPageRecord[] = [];

  pages.push({
    id: "home",
    kind: "home",
    path: "/",
    title: seo.siteTitle,
    seoTitle: staticPages["/"]?.seoTitle?.trim() || seo.siteTitle,
    seoDescription: staticPages["/"]?.seoDescription?.trim() || seo.metaDescription,
    imageUrl: staticPages["/"]?.imageUrl?.trim() || defaultOg,
    imageAlt: staticPages["/"]?.imageAlt?.trim() || buildImageAltText(seo.siteTitle, siteName),
    entityTable: "site",
    published: true,
  });

  pages.push({
    id: "collections",
    kind: "collections",
    path: "/collections",
    title: "Koleksiyonlar",
    seoTitle: `Koleksiyonlar | ${siteName}`,
    seoDescription: `Tüm ürün koleksiyonları — ${siteName}`,
    imageUrl: defaultOg,
    imageAlt: `Koleksiyonlar — ${siteName}`,
    published: true,
  });

  pages.push({
    id: "collections-all",
    kind: "collection",
    path: "/collections/all",
    title: "Tüm ürünler",
    seoTitle: `Tüm ürünler | ${siteName}`,
    seoDescription: `Mağazadaki tüm ürünleri keşfedin — ${siteName}`,
    imageUrl: defaultOg,
    imageAlt: `Tüm ürünler — ${siteName}`,
    published: true,
  });

  const [collections, categories, shopPages, blogPosts] = await Promise.all([
    prisma.storeCollection.findMany({
      where: { siteId, published: true },
      select: { id: true, slug: true, title: true, description: true, imageUrl: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.storeCategory.findMany({
      where: { siteId, active: true },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        imageUrl: true,
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.shopPage.findMany({
      where: { siteId, published: true, slug: { not: "home" } },
      select: {
        id: true,
        slug: true,
        title: true,
        blocks: true,
        seoTitle: true,
        seoDescription: true,
      },
      orderBy: { title: "asc" },
    }),
    prisma.storeBlogPost.findMany({
      where: { siteId, published: true },
      select: {
        id: true,
        slug: true,
        titleTr: true,
        excerptTr: true,
        imageUrl: true,
        seoTitle: true,
        seoDescription: true,
      },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    }),
  ]);

  for (const c of collections) {
    if (c.slug === "all") continue;
    const path = `/collections/${c.slug}`;
    pages.push({
      id: `collection:${c.id}`,
      kind: "collection",
      path,
      title: c.title,
      seoTitle: staticPages[path]?.seoTitle?.trim() || `${c.title} | ${siteName}`,
      seoDescription: staticPages[path]?.seoDescription?.trim() || c.description?.trim() || "",
      imageUrl: c.imageUrl?.trim() || defaultOg,
      imageAlt: c.title,
      entityId: c.id,
      entityTable: "storeCollection",
      published: true,
    });
  }

  for (const cat of categories) {
    pages.push({
      id: `category:${cat.id}`,
      kind: "category",
      path: `/collections/all?category=${encodeURIComponent(cat.slug)}`,
      title: cat.title,
      seoTitle: cat.seoTitle?.trim() || `${cat.title} | ${siteName}`,
      seoDescription: cat.seoDescription?.trim() || cat.description?.trim() || "",
      imageUrl: cat.imageUrl?.trim() || defaultOg,
      imageAlt: cat.title,
      entityId: cat.id,
      entityTable: "storeCategory",
      published: true,
    });
  }

  for (const p of shopPages) {
    const blocks = parseBlocks(p.blocks);
    const path = `/pages/${p.slug}`;
    const blockImage = firstImageFromBlocks(blocks);
    const imageUrl = blockImage || defaultOg;
    const imageAlt = imageUrl ? buildImageAltText(p.title, siteName) : null;
    pages.push({
      id: `cms:${p.id}`,
      kind: "cms",
      path,
      title: p.title,
      seoTitle: p.seoTitle?.trim() || p.title,
      seoDescription: p.seoDescription?.trim() || "",
      imageUrl,
      imageAlt,
      entityId: p.id,
      entityTable: "shopPage",
      published: true,
    });
  }

  if (blogPosts.length) {
    pages.push({
      id: "blog-list",
      kind: "blog-list",
      path: "/blogs/news",
      title: "Blog",
      seoTitle: `Blog | ${siteName}`,
      seoDescription: `${siteName} blog — haberler, ipuçları ve güncellemeler.`,
      imageUrl: defaultOg,
      imageAlt: `Blog — ${siteName}`,
      published: true,
    });
  }

  for (const post of blogPosts) {
    pages.push({
      id: `blog:${post.id}`,
      kind: "blog-post",
      path: `/blogs/news/${post.slug}`,
      title: post.titleTr,
      seoTitle: post.seoTitle?.trim() || `${post.titleTr} | ${siteName}`,
      seoDescription: post.seoDescription?.trim() || post.excerptTr?.trim() || "",
      imageUrl: post.imageUrl?.trim() || defaultOg,
      imageAlt: post.titleTr,
      entityId: post.id,
      entityTable: "blogPost",
      published: true,
    });
  }

  return pages.map((page) => applyStaticOverlay(page, staticPages, defaultOg));
}
