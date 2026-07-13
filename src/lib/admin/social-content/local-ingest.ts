import "server-only";

import { templatePack } from "@/lib/admin/social-content/ai-generate";
import {
  parseSocialCreativeBrief,
  serializeSocialCreativeBrief,
  type SocialCreativeBrief,
} from "@/lib/admin/social-content/creative-brief";
import { loadSocialProductContext } from "@/lib/admin/social-content/product-context";
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
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { prisma } from "@/lib/prisma";

const draftInclude = {
  product: { select: { title: true, slug: true } },
} as const;

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

export async function ingestLocalStudioDrafts(params: {
  siteId: string;
  siteName: string;
  productId: string;
  platforms?: SocialPlatform[];
  brief: SocialCreativeBrief;
  imagePrompt?: string | null;
  mediaUrls: string[];
  mediaSource?: string;
  aiProvider?: string;
}): Promise<{ ok: boolean; drafts?: SocialContentDraftDTO[]; error?: string }> {
  const ctx = await loadSocialProductContext(params.siteId, params.productId);
  if (!ctx) {
    return { ok: false, error: "Ürün bulunamadı veya yayından kaldırılmış" };
  }

  const platforms = (params.platforms?.length ? params.platforms : [...SOCIAL_PLATFORMS]).filter((p) =>
    SOCIAL_PLATFORMS.includes(p),
  );
  if (!platforms.length) {
    return { ok: false, error: "Geçerli platform yok" };
  }

  const baseUrl = `${getPublicSiteUrl()}/products/${ctx.slug}`;
  const pack = templatePack(ctx, params.siteName, baseUrl);
  const briefJson = serializeSocialCreativeBrief(params.brief);
  const mediaUrls = params.mediaUrls.map((u) => u.trim()).filter(Boolean);
  if (!mediaUrls.length) {
    return { ok: false, error: "En az bir görsel URL gerekli" };
  }

  const drafts: SocialContentDraftDTO[] = [];
  const mediaSource = params.mediaSource ?? "ai_generated";
  const aiProvider = params.aiProvider ?? "local-studio";

  for (const platform of platforms) {
    const content = pack[platform];
    const productUrl = productUtmUrl(baseUrl, platform, ctx.slug);
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
        mediaUrlsJson: serializeMediaUrls(mediaUrls),
        mediaSource,
        creativeBriefJson: briefJson,
        imagePrompt: params.imagePrompt ?? null,
        aiProvider,
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
        mediaUrlsJson: serializeMediaUrls(mediaUrls),
        mediaSource,
        creativeBriefJson: briefJson,
        imagePrompt: params.imagePrompt ?? null,
        aiProvider,
        publishedUrl: null,
        publishError: null,
      },
      include: draftInclude,
    });
    drafts.push(rowToDto(row));
  }

  return { ok: true, drafts };
}

export async function listLocalStudioDrafts(
  siteId: string,
  productId?: string,
): Promise<SocialContentDraftDTO[]> {
  const rows = await prisma.socialContentDraft.findMany({
    where: {
      siteId,
      ...(productId ? { productId } : {}),
    },
    include: draftInclude,
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
  });
  return rows.map(rowToDto);
}

export function parseBriefFromBody(brief: unknown): SocialCreativeBrief | null {
  if (!brief || typeof brief !== "object") return null;
  const o = brief as Record<string, unknown>;
  if (typeof o.productAngle !== "string" && typeof o.visualScene !== "string") return null;
  return parseSocialCreativeBrief(JSON.stringify(o));
}
