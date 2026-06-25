import "server-only";

import { parseBlocks, serializeBlocks, type ShopBlock } from "@/lib/blocks/schema";
import {
  buildHomeSeoDescription,
  buildHomeSeoTitle,
  buildImageAltText,
  buildSitePageSeoDescription,
  buildSitePageSeoTitle,
  ensureSeoTitleLength,
} from "@/lib/admin/site-seo/content-builders";
import { evaluateSitePageSeo, scoreSitePage } from "@/lib/admin/site-seo/audit";
import { loadSiteSeoPages } from "@/lib/admin/site-seo/page-loader";
import type { SiteSeoOptimizeResult, SiteSeoPageRecord } from "@/lib/admin/site-seo/types";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { getSiteBranding, getSiteSeo, parseSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";

function patchBlockImageAlts(blocks: ShopBlock[], alt: string): ShopBlock[] {
  return blocks.map((block) => {
    if (block.type === "image" && block.props.src?.trim()) {
      return { ...block, props: { ...block.props, alt } };
    }
    if (block.type === "heroSlider") {
      return {
        ...block,
        props: {
          ...block.props,
          slides: block.props.slides.map((slide) =>
            slide.imageUrl?.trim() ? { ...slide, headline: alt } : slide,
          ),
        },
      };
    }
    if (block.type === "imageTextSplit" && block.props.imageUrl?.trim()) {
      return { ...block, props: { ...block.props, imageAlt: alt } };
    }
    return block;
  });
}

function buildOptimized(
  page: SiteSeoPageRecord,
  siteName: string,
  siteMetaDescription: string | undefined,
  defaultOgImage: string | null,
) {
  const title = page.title.trim();
  const seoTitle = ensureSeoTitleLength(
    page.kind === "home"
      ? buildHomeSeoTitle(siteName, siteMetaDescription)
      : buildSitePageSeoTitle(title, siteName),
    siteName,
  );

  const seoDescription =
    page.kind === "home"
      ? buildHomeSeoDescription(siteName, siteMetaDescription)
      : buildSitePageSeoDescription({
          pageTitle: title,
          siteName,
          hint: page.seoDescription || undefined,
          fallback: page.seoDescription || undefined,
          kind: page.kind,
        });

  const hasImage = Boolean(page.imageUrl?.trim() || defaultOgImage);
  const imageAlt = hasImage ? buildImageAltText(title, siteName) : null;
  const imageUrl = page.imageUrl?.trim() || defaultOgImage || undefined;

  return { seoTitle, seoDescription, imageAlt, imageUrl };
}

export async function auditSiteSeo(siteId: string) {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId } });
  if (!site) throw new Error("Site bulunamadı");

  const settings = parseSiteSettings(site.settingsJson);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:5555";
  const pages = await loadSiteSeoPages(siteId, site.name, settings);

  const audited = pages.map((page) => {
    const items = evaluateSitePageSeo(page, siteUrl);
    return { ...page, score: scoreSitePage(items), items };
  });

  const summary = audited.reduce(
    (acc, p) => {
      acc.total += 1;
      for (const item of p.items) acc[item.status] += 1;
      return acc;
    },
    { ok: 0, warn: 0, fail: 0, total: 0 },
  );

  return {
    scannedAt: new Date().toISOString(),
    siteName: site.name,
    siteUrl,
    summary,
    pages: audited,
  };
}

export async function optimizeSiteSeo(siteId: string): Promise<SiteSeoOptimizeResult> {
  const site = await prisma.storeSite.findUnique({ where: { id: siteId } });
  if (!site) throw new Error("Site bulunamadı");

  let settings = parseSiteSettings(site.settingsJson);
  const seo = getSiteSeo(settings, site.name);
  const branding = getSiteBranding(settings);
  const defaultOg = seo.ogImageUrl?.trim() || branding.logoUrl?.trim() || null;
  const pages = await loadSiteSeoPages(siteId, site.name, settings);
  const results: SiteSeoOptimizeResult["pages"] = [];
  const staticPages: Record<
    string,
    { seoTitle?: string; seoDescription?: string; imageAlt?: string; imageUrl?: string }
  > = { ...(settings.seo?.staticPages ?? {}) };

  for (const page of pages) {
    const existingStatic = settings.seo?.staticPages?.[page.path];
    const hasSearchIntentLanding = Object.keys(settings.seo?.searchIntentMeta ?? {}).length > 0;
    if (
      page.path === "/collections/all" &&
      (hasSearchIntentLanding || (existingStatic?.seoDescription?.trim().length ?? 0) >= 70)
    ) {
      const seoTitle = existingStatic?.seoTitle?.trim() || page.seoTitle;
      const seoDescription = existingStatic?.seoDescription?.trim() || page.seoDescription;
      staticPages[page.path] = {
        seoTitle,
        seoDescription,
        imageAlt: existingStatic?.imageAlt,
        imageUrl: existingStatic?.imageUrl,
      };
      results.push({ path: page.path, seoTitle, seoDescription, imageAlt: existingStatic?.imageAlt ?? null });
      continue;
    }

    const { seoTitle, seoDescription, imageAlt, imageUrl } = buildOptimized(
      page,
      site.name,
      seo.metaDescription,
      defaultOg,
    );

    staticPages[page.path] = { seoTitle, seoDescription, imageAlt: imageAlt ?? undefined, imageUrl };

    if (page.entityTable === "shopPage" && page.entityId) {
      const row = await prisma.shopPage.findUnique({
        where: { id: page.entityId },
        select: { blocks: true },
      });
      const blocks = row ? patchBlockImageAlts(parseBlocks(row.blocks), imageAlt ?? page.title) : [];
      await prisma.shopPage.update({
        where: { id: page.entityId },
        data: {
          seoTitle,
          seoDescription,
          ...(blocks.length ? { blocks: serializeBlocks(blocks) } : {}),
        },
      });
    } else if (page.entityTable === "blogPost" && page.entityId) {
      await prisma.storeBlogPost.update({
        where: { id: page.entityId },
        data: { seoTitle, seoDescription },
      });
    } else if (page.entityTable === "storeCategory" && page.entityId) {
      await prisma.storeCategory.update({
        where: { id: page.entityId },
        data: { seoTitle, seoDescription },
      });
    } else if (page.entityTable === "storeCollection" && page.entityId) {
      await prisma.storeCollection.update({
        where: { id: page.entityId },
        data: { description: seoDescription },
      });
    }

    results.push({ path: page.path, seoTitle, seoDescription, imageAlt });
  }

  const homeMeta = staticPages["/"];
  const finalSettings = mergeSiteSettings(settings, {
    seo: {
      ...settings.seo,
      staticPages,
      metaDescription: homeMeta?.seoDescription ?? settings.seo?.metaDescription,
    },
  });

  await prisma.storeSite.update({
    where: { id: siteId },
    data: { settingsJson: JSON.stringify(finalSettings) },
  });

  try {
    revalidateStorePublicCache(siteId);
  } catch {
    // revalidateTag yalnızca Next istek bağlamında çalışır; kayıt yine de geçerlidir
  }

  return { updated: results.length, pages: results };
}
