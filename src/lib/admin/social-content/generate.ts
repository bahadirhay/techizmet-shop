import "server-only";

import { generateSocialContentPack } from "@/lib/admin/social-content/ai-generate";
import {
  buildSocialImagePrompt,
  generateSocialCreativeBrief,
  parseSocialCreativeBrief,
  platformImageAspect,
  serializeSocialCreativeBrief,
  type SocialCreativeBrief,
  type SocialImageAspect,
} from "@/lib/admin/social-content/creative-brief";
import { loadSocialProductContext } from "@/lib/admin/social-content/product-context";
import { generateSocialCreativeImage } from "@/lib/admin/social-content/social-image";
import {
  detectNaturalProductBadge,
  type SocialComposeOptions,
} from "@/lib/admin/social-content/social-compose";
import { loadSocialPerformanceHints } from "@/lib/admin/social-content/social-performance";
import {
  type SocialContentDraftDTO,
  type SocialPlatform,
  SOCIAL_PLATFORMS,
  parseHashtagsJson,
  parseMediaUrlsJson,
  platformFormat,
  serializeHashtags,
  serializeMediaUrls,
} from "@/lib/admin/social-content/types";
import { productUtmUrl } from "@/lib/admin/social-content/utm";
import { getSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { getSiteBranding, getSiteSettings } from "@/lib/site-settings";
import { resolveSocialStudioSettings } from "@/lib/social-publish/settings";
import { prisma } from "@/lib/prisma";

function rowToDto(
  row: {
    id: string;
    productId: string;
    platform: string;
    format: string;
    status: string;
    title: string | null;
    caption: string | null;
    hook: string | null;
    script: string | null;
    body: string | null;
    hashtagsJson: string | null;
    cta: string | null;
    productUrl: string | null;
    mediaUrlsJson: string | null;
    mediaSource: string | null;
    imagePrompt: string | null;
    aiProvider: string | null;
    publishedUrl: string | null;
    publishedAt: Date | null;
    publishError: string | null;
    scheduledAt: Date | null;
    updatedAt: Date;
    product: { title: string; slug: string };
  },
): SocialContentDraftDTO {
  return {
    id: row.id,
    productId: row.productId,
    productTitle: row.product.title,
    productSlug: row.product.slug,
    platform: row.platform as SocialPlatform,
    format: row.format,
    status: row.status as SocialContentDraftDTO["status"],
    title: row.title,
    caption: row.caption,
    hook: row.hook,
    script: row.script,
    body: row.body,
    hashtags: parseHashtagsJson(row.hashtagsJson),
    cta: row.cta,
    productUrl: row.productUrl,
    mediaUrls: parseMediaUrlsJson(row.mediaUrlsJson),
    mediaSource: row.mediaSource ?? null,
    imagePrompt: row.imagePrompt ?? null,
    aiProvider: row.aiProvider,
    publishedUrl: row.publishedUrl,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    publishError: row.publishError,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

const draftInclude = {
  product: { select: { title: true, slug: true } },
} as const;

export async function listSocialContentDrafts(
  siteId: string,
  opts?: { productId?: string; limit?: number },
): Promise<SocialContentDraftDTO[]> {
  const rows = await prisma.socialContentDraft.findMany({
    where: {
      siteId,
      ...(opts?.productId ? { productId: opts.productId } : {}),
    },
    include: draftInclude,
    orderBy: [{ updatedAt: "desc" }],
    take: opts?.limit ?? 200,
  });
  return rows.map(rowToDto);
}

export type GenerateSocialResult = {
  ok: boolean;
  productId: string;
  productTitle?: string;
  message?: string;
  drafts?: SocialContentDraftDTO[];
  error?: string;
  imageNote?: string;
};

async function generatePlatformImages(params: {
  siteId: string;
  siteName: string;
  ctx: Awaited<ReturnType<typeof loadSocialProductContext>> & object;
  brief: SocialCreativeBrief;
  aiConfig: Awaited<ReturnType<typeof getSeoAiConfig>>;
  compose?: Omit<SocialComposeOptions, "aspect"> | null;
}): Promise<{
  byAspect: Partial<Record<SocialImageAspect, { url: string; branded: boolean }>>;
  imageNote: string;
  imageProvider: string | null;
  imagePrompt: string | null;
}> {
  const aspects: SocialImageAspect[] = ["square", "portrait"];
  const byAspect: Partial<Record<SocialImageAspect, { url: string; branded: boolean }>> = {};
  const notes: string[] = [];
  let imageProvider: string | null = null;
  let imagePrompt: string | null = null;

  for (const aspect of aspects) {
    const prompt = buildSocialImagePrompt({
      brief: params.brief,
      ctx: params.ctx,
      siteName: params.siteName,
      aspect,
    });
    if (!imagePrompt) imagePrompt = prompt;
    const result = await generateSocialCreativeImage({
      siteId: params.siteId,
      prompt,
      aspect,
      aiConfig: params.aiConfig,
      compose: params.compose,
    });
    if (result.url) {
      byAspect[aspect] = { url: result.url, branded: result.branded };
      imageProvider = result.provider;
      notes.push(`${aspect}: ${result.message}`);
    } else {
      notes.push(`${aspect}: ${result.message}`);
    }
  }

  return {
    byAspect,
    imageNote: notes.join(" · "),
    imageProvider,
    imagePrompt,
  };
}

function mediaForPlatform(
  platform: SocialPlatform,
  byAspect: Partial<Record<SocialImageAspect, { url: string; branded: boolean }>>,
  fallbackUrls: string[],
): { urls: string[]; source: "ai_generated" | "ai_branded" | "product_photo" } {
  const aspect = platformImageAspect(platform);
  const generated =
    byAspect[aspect] ?? (aspect === "landscape" ? byAspect.square : undefined);
  if (generated) {
    return {
      urls: [generated.url],
      source: generated.branded ? "ai_branded" : "ai_generated",
    };
  }
  if (fallbackUrls.length) return { urls: fallbackUrls.slice(0, 1), source: "product_photo" };
  return { urls: [], source: "product_photo" };
}

export async function generateSocialContentForProduct(params: {
  siteId: string;
  siteName: string;
  productId: string;
  skipImages?: boolean;
}): Promise<GenerateSocialResult> {
  const ctx = await loadSocialProductContext(params.siteId, params.productId);
  if (!ctx) {
    return { ok: false, productId: params.productId, error: "Ürün bulunamadı veya yayından kaldırılmış" };
  }

  const baseUrl = `${getPublicSiteUrl()}/products/${ctx.slug}`;
  const aiConfig = await getSeoAiConfig(params.siteId);
  const [settings, performanceHints] = await Promise.all([
    getSiteSettings(params.siteId),
    loadSocialPerformanceHints(params.siteId),
  ]);
  const studio = resolveSocialStudioSettings(settings);
  const branding = getSiteBranding(settings);

  const composeOptions: Omit<SocialComposeOptions, "aspect"> | null = studio.brandOverlay
    ? {
        siteName: params.siteName,
        productTitle: ctx.title,
        priceLabel: ctx.priceLabel,
        logoUrl: branding.logoUrlLight || branding.logoUrl,
        accentColor: studio.accentColor,
        template: studio.overlayTemplate,
        badgeText: detectNaturalProductBadge(ctx.title, ctx.description),
      }
    : null;

  const { brief, source: briefSource } = await generateSocialCreativeBrief({
    ctx,
    siteName: params.siteName,
    aiConfig,
    performanceHints,
  });
  const briefJson = serializeSocialCreativeBrief(brief);

  let byAspect: Partial<Record<SocialImageAspect, { url: string; branded: boolean }>> = {};
  let imageNote = "";
  let imageProvider: string | null = null;
  let imagePrompt: string | null = null;

  if (!params.skipImages) {
    const images = await generatePlatformImages({
      siteId: params.siteId,
      siteName: params.siteName,
      ctx,
      brief,
      aiConfig,
      compose: composeOptions,
    });
    byAspect = images.byAspect;
    imageNote = images.imageNote;
    imageProvider = images.imageProvider;
    imagePrompt = images.imagePrompt;
  }

  const { pack, aiProvider, message } = await generateSocialContentPack({
    ctx,
    siteName: params.siteName,
    productUrl: baseUrl,
    aiConfig,
    brief,
  });

  const combinedProvider = imageProvider
    ? `${aiProvider}+img:${imageProvider}`
    : aiProvider;

  const drafts: SocialContentDraftDTO[] = [];

  for (const platform of SOCIAL_PLATFORMS) {
    const content = pack[platform];
    const productUrl = productUtmUrl(baseUrl, platform, ctx.slug);
    const media = mediaForPlatform(platform, byAspect, ctx.imageUrls);
    const row = await prisma.socialContentDraft.upsert({
      where: {
        siteId_productId_platform: {
          siteId: params.siteId,
          productId: ctx.id,
          platform,
        },
      },
      create: {
        siteId: params.siteId,
        productId: ctx.id,
        platform,
        format: platformFormat(platform),
        status: "draft",
        title: content.title ?? null,
        caption: content.caption ?? null,
        hook: content.hook ?? null,
        script: content.script ?? null,
        body: content.body ?? null,
        hashtagsJson: serializeHashtags(content.hashtags),
        cta: content.cta ?? null,
        productUrl,
        mediaUrlsJson: serializeMediaUrls(media.urls),
        mediaSource: media.source,
        creativeBriefJson: briefJson,
        imagePrompt,
        aiProvider: combinedProvider,
      },
      update: {
        format: platformFormat(platform),
        status: "draft",
        title: content.title ?? null,
        caption: content.caption ?? null,
        hook: content.hook ?? null,
        script: content.script ?? null,
        body: content.body ?? null,
        hashtagsJson: serializeHashtags(content.hashtags),
        cta: content.cta ?? null,
        productUrl,
        mediaUrlsJson: serializeMediaUrls(media.urls),
        mediaSource: media.source,
        creativeBriefJson: briefJson,
        imagePrompt,
        aiProvider: combinedProvider,
        publishedUrl: null,
      },
      include: draftInclude,
    });
    drafts.push(rowToDto(row));
  }

  const parts = [message, `Brif: ${briefSource}`];
  if (performanceHints.available) parts.push(performanceHints.insightNote);
  if (imageNote) parts.push(imageNote);

  return {
    ok: true,
    productId: ctx.id,
    productTitle: ctx.title,
    message: parts.join(" · "),
    imageNote,
    drafts,
  };
}

export async function regenerateSocialImageForDraft(params: {
  siteId: string;
  siteName: string;
  draftId: string;
}): Promise<{ ok: boolean; draft?: SocialContentDraftDTO; error?: string; message?: string }> {
  const existing = await prisma.socialContentDraft.findFirst({
    where: { id: params.draftId, siteId: params.siteId },
    include: draftInclude,
  });
  if (!existing) return { ok: false, error: "Taslak bulunamadı" };

  const ctx = await loadSocialProductContext(params.siteId, existing.productId);
  if (!ctx) return { ok: false, error: "Ürün bulunamadı" };

  const [settings, performanceHints] = await Promise.all([
    getSiteSettings(params.siteId),
    loadSocialPerformanceHints(params.siteId),
  ]);
  const studio = resolveSocialStudioSettings(settings);
  const branding = getSiteBranding(settings);
  const composeOptions: Omit<SocialComposeOptions, "aspect"> | null = studio.brandOverlay
    ? {
        siteName: params.siteName,
        productTitle: ctx.title,
        priceLabel: ctx.priceLabel,
        logoUrl: branding.logoUrlLight || branding.logoUrl,
        accentColor: studio.accentColor,
        template: studio.overlayTemplate,
        badgeText: detectNaturalProductBadge(ctx.title, ctx.description),
      }
    : null;

  const aiConfig = await getSeoAiConfig(params.siteId);
  let brief: SocialCreativeBrief;
  const parsedBrief = parseSocialCreativeBrief(existing.creativeBriefJson);
  if (parsedBrief) {
    brief = parsedBrief;
  } else {
    const generated = await generateSocialCreativeBrief({
      ctx,
      siteName: params.siteName,
      aiConfig,
      performanceHints,
    });
    brief = generated.brief;
  }

  const aspect = platformImageAspect(existing.platform);
  const prompt = buildSocialImagePrompt({
    brief,
    ctx,
    siteName: params.siteName,
    aspect,
  });

  const image = await generateSocialCreativeImage({
    siteId: params.siteId,
    prompt,
    aspect,
    aiConfig,
    compose: composeOptions,
  });

  if (!image.url) {
    return { ok: false, error: image.message };
  }

  const row = await prisma.socialContentDraft.update({
    where: { id: existing.id },
    data: {
      mediaUrlsJson: serializeMediaUrls([image.url]),
      mediaSource: image.branded ? "ai_branded" : "ai_generated",
      imagePrompt: prompt,
      aiProvider: existing.aiProvider?.includes("+img:")
        ? existing.aiProvider.replace(/\+img:[^+]+$/, `+img:${image.provider}`)
        : `${existing.aiProvider ?? "template"}+img:${image.provider}`,
    },
    include: draftInclude,
  });

  return { ok: true, draft: rowToDto(row), message: image.message };
}

export async function generateSocialContentBulk(params: {
  siteId: string;
  siteName: string;
  productIds: string[];
}): Promise<{
  ok: boolean;
  created: number;
  failed: number;
  results: GenerateSocialResult[];
}> {
  const results: GenerateSocialResult[] = [];
  let created = 0;
  let failed = 0;

  for (const productId of params.productIds) {
    const result = await generateSocialContentForProduct({
      siteId: params.siteId,
      siteName: params.siteName,
      productId,
    });
    results.push(result);
    if (result.ok) created += 1;
    else failed += 1;
  }

  return { ok: failed === 0, created, failed, results };
}

export async function updateSocialContentDraft(
  siteId: string,
  id: string,
  patch: {
    title?: string | null;
    caption?: string | null;
    hook?: string | null;
    script?: string | null;
    body?: string | null;
    hashtags?: string[];
    cta?: string | null;
    status?: string;
    scheduledAt?: string | null;
  },
): Promise<SocialContentDraftDTO | null> {
  const existing = await prisma.socialContentDraft.findFirst({ where: { id, siteId } });
  if (!existing) return null;

  const row = await prisma.socialContentDraft.update({
    where: { id },
    data: {
      title: patch.title !== undefined ? patch.title : undefined,
      caption: patch.caption !== undefined ? patch.caption : undefined,
      hook: patch.hook !== undefined ? patch.hook : undefined,
      script: patch.script !== undefined ? patch.script : undefined,
      body: patch.body !== undefined ? patch.body : undefined,
      hashtagsJson: patch.hashtags !== undefined ? serializeHashtags(patch.hashtags) : undefined,
      cta: patch.cta !== undefined ? patch.cta : undefined,
      status: patch.status !== undefined ? patch.status : undefined,
      scheduledAt:
        patch.scheduledAt !== undefined
          ? patch.scheduledAt
            ? new Date(patch.scheduledAt)
            : null
          : undefined,
    },
    include: draftInclude,
  });
  return rowToDto(row);
}
