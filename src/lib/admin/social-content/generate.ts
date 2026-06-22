import "server-only";

import { generateSocialContentPack } from "@/lib/admin/social-content/ai-generate";
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
import { getSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
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
};

export async function generateSocialContentForProduct(params: {
  siteId: string;
  siteName: string;
  productId: string;
}): Promise<GenerateSocialResult> {
  const ctx = await loadSocialProductContext(params.siteId, params.productId);
  if (!ctx) {
    return { ok: false, productId: params.productId, error: "Ürün bulunamadı veya yayından kaldırılmış" };
  }

  const baseUrl = `${getPublicSiteUrl()}/products/${ctx.slug}`;
  const aiConfig = await getSeoAiConfig(params.siteId);
  const { pack, aiProvider, message } = await generateSocialContentPack({
    ctx,
    siteName: params.siteName,
    productUrl: baseUrl,
    aiConfig,
  });

  const drafts: SocialContentDraftDTO[] = [];

  for (const platform of SOCIAL_PLATFORMS) {
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
        mediaUrlsJson: serializeMediaUrls(ctx.imageUrls),
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
        mediaUrlsJson: serializeMediaUrls(ctx.imageUrls),
        aiProvider,
        publishedUrl: null,
      },
      include: draftInclude,
    });
    drafts.push(rowToDto(row));
  }

  return {
    ok: true,
    productId: ctx.id,
    productTitle: ctx.title,
    message,
    drafts,
  };
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
