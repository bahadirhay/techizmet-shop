import "server-only";

import {
  parseHashtagsJson,
  parseMediaUrlsJson,
  type SocialPlatform,
} from "@/lib/admin/social-content/types";
import { buildPublishText, buildPublishTitle } from "@/lib/social-publish/build-caption";
import { publishToInstagram } from "@/lib/social-publish/meta";
import { publishToLinkedIn } from "@/lib/social-publish/linkedin";
import { platformPublishReady, resolveSocialPublishConfig } from "@/lib/social-publish/settings";
import { publishToTikTok } from "@/lib/social-publish/tiktok";
import type { PublishResult } from "@/lib/social-publish/types";
import { publishToYouTube } from "@/lib/social-publish/youtube";
import { toAbsoluteMediaUrl } from "@/lib/seo/site-url";
import { getSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

const PLATFORM_CONFIG_KEY: Record<SocialPlatform, "meta" | "tiktok" | "youtube" | "linkedin"> = {
  instagram: "meta",
  tiktok: "tiktok",
  youtube: "youtube",
  linkedin: "linkedin",
};

async function publishDraftToPlatform(
  platform: SocialPlatform,
  config: ReturnType<typeof resolveSocialPublishConfig>,
  draft: {
    title: string | null;
    caption: string | null;
    hook: string | null;
    script: string | null;
    body: string | null;
    hashtags: string[];
    cta: string | null;
    productUrl: string | null;
    mediaUrls: string[];
  },
): Promise<PublishResult> {
  const text = buildPublishText(draft, platform);
  const title = buildPublishTitle(draft, platform);
  const absImages = draft.mediaUrls
    .map((u) => toAbsoluteMediaUrl(u))
    .filter((u): u is string => Boolean(u));

  if (platform === "instagram") {
    const imageUrl = absImages[0];
    if (!imageUrl) return { ok: false, error: "Herkese açık ürün görseli gerekir" };
    return publishToInstagram({
      config: config.meta,
      imageUrl,
      caption: text,
    });
  }

  if (platform === "tiktok") {
    return publishToTikTok({
      config: config.tiktok,
      imageUrls: absImages,
      title,
      description: text,
    });
  }

  if (platform === "linkedin") {
    const imageUrl = absImages[0];
    if (!imageUrl) return { ok: false, error: "Herkese açık ürün görseli gerekir" };
    return publishToLinkedIn({ config: config.linkedin, imageUrl, text });
  }

  if (platform === "youtube") {
    return publishToYouTube({ config: config.youtube, title, description: text });
  }

  return { ok: false, error: "Desteklenmeyen platform" };
}

export type PublishSocialDraftResult = {
  ok: boolean;
  draftId: string;
  platform: SocialPlatform;
  publishedUrl?: string;
  error?: string;
  manualOnly?: boolean;
};

export async function publishSocialContentDraft(
  siteId: string,
  draftId: string,
): Promise<PublishSocialDraftResult> {
  const row = await prisma.socialContentDraft.findFirst({
    where: { id: draftId, siteId },
    include: { product: { select: { title: true } } },
  });
  if (!row) {
    return { ok: false, draftId, platform: "instagram", error: "Taslak bulunamadı" };
  }

  const platform = row.platform as SocialPlatform;
  const settings = await getSiteSettings(siteId);
  const config = resolveSocialPublishConfig(settings);
  const configKey = PLATFORM_CONFIG_KEY[platform];

  if (!platformPublishReady(configKey, config)) {
    return {
      ok: false,
      draftId,
      platform,
      error: `${platform} otomatik yayın kapalı veya API bilgileri eksik`,
    };
  }

  const draft = {
    title: row.title,
    caption: row.caption,
    hook: row.hook,
    script: row.script,
    body: row.body,
    hashtags: parseHashtagsJson(row.hashtagsJson),
    cta: row.cta,
    productUrl: row.productUrl,
    mediaUrls: parseMediaUrlsJson(row.mediaUrlsJson),
  };

  const result = await publishDraftToPlatform(platform, config, draft);

  if (result.manualOnly) {
    await prisma.socialContentDraft.update({
      where: { id: draftId },
      data: {
        status: "failed",
        publishError: result.error ?? "Manuel yükleme gerekir",
        publishedAt: null,
      },
    });
    return { ok: false, draftId, platform, error: result.error, manualOnly: true };
  }

  if (!result.ok) {
    await prisma.socialContentDraft.update({
      where: { id: draftId },
      data: {
        status: "failed",
        publishError: result.error ?? "Yayın başarısız",
        publishedAt: null,
      },
    });
    return { ok: false, draftId, platform, error: result.error };
  }

  await prisma.socialContentDraft.update({
    where: { id: draftId },
    data: {
      status: "published",
      publishedUrl: result.publishedUrl ?? null,
      publishedAt: new Date(),
      publishError: null,
      scheduledAt: null,
    },
  });

  return {
    ok: true,
    draftId,
    platform,
    publishedUrl: result.publishedUrl,
  };
}

export async function scheduleSocialContentDraft(
  siteId: string,
  draftId: string,
  scheduledAt: Date,
): Promise<{ ok: boolean; error?: string }> {
  const row = await prisma.socialContentDraft.findFirst({ where: { id: draftId, siteId } });
  if (!row) return { ok: false, error: "Taslak bulunamadı" };
  if (scheduledAt.getTime() <= Date.now()) {
    return { ok: false, error: "Zamanlama gelecekte bir tarih olmalı" };
  }

  await prisma.socialContentDraft.update({
    where: { id: draftId },
    data: {
      status: "scheduled",
      scheduledAt,
      publishError: null,
    },
  });
  return { ok: true };
}
