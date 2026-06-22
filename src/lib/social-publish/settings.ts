import type { SiteSettings, StoreSocialPublishSettings } from "@/lib/site-settings";

export type ResolvedSocialPublishConfig = {
  meta: {
    enabled: boolean;
    accessToken: string;
    pageId: string;
    instagramAccountId: string;
  };
  tiktok: {
    enabled: boolean;
    accessToken: string;
    openId: string;
  };
  youtube: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    channelId: string;
  };
  linkedin: {
    enabled: boolean;
    accessToken: string;
    authorUrn: string;
  };
};

export function resolveSocialPublishConfig(settings: SiteSettings): ResolvedSocialPublishConfig {
  const sp = settings.socialPublish ?? {};
  return {
    meta: {
      enabled: Boolean(sp.meta?.enabled),
      accessToken: sp.meta?.accessToken?.trim() ?? "",
      pageId: sp.meta?.pageId?.trim() ?? "",
      instagramAccountId: sp.meta?.instagramAccountId?.trim() ?? "",
    },
    tiktok: {
      enabled: Boolean(sp.tiktok?.enabled),
      accessToken: sp.tiktok?.accessToken?.trim() ?? "",
      openId: sp.tiktok?.openId?.trim() ?? "",
    },
    youtube: {
      enabled: Boolean(sp.youtube?.enabled),
      clientId: sp.youtube?.clientId?.trim() ?? "",
      clientSecret: sp.youtube?.clientSecret?.trim() ?? "",
      refreshToken: sp.youtube?.refreshToken?.trim() ?? "",
      channelId: sp.youtube?.channelId?.trim() ?? "",
    },
    linkedin: {
      enabled: Boolean(sp.linkedin?.enabled),
      accessToken: sp.linkedin?.accessToken?.trim() ?? "",
      authorUrn: sp.linkedin?.authorUrn?.trim() ?? "",
    },
  };
}

export function platformPublishReady(
  platform: keyof ResolvedSocialPublishConfig,
  config: ResolvedSocialPublishConfig,
): boolean {
  if (platform === "meta") {
    return config.meta.enabled && Boolean(config.meta.accessToken && config.meta.instagramAccountId);
  }
  if (platform === "tiktok") {
    return config.tiktok.enabled && Boolean(config.tiktok.accessToken);
  }
  if (platform === "youtube") {
    return config.youtube.enabled && Boolean(config.youtube.clientId && config.youtube.refreshToken);
  }
  if (platform === "linkedin") {
    return config.linkedin.enabled && Boolean(config.linkedin.accessToken && config.linkedin.authorUrn);
  }
  return false;
}

export function socialPublishSecretsConfigured(sp: StoreSocialPublishSettings | undefined): {
  metaToken: boolean;
  tiktokToken: boolean;
  youtubeRefresh: boolean;
  linkedinToken: boolean;
} {
  return {
    metaToken: Boolean(sp?.meta?.accessToken?.trim()),
    tiktokToken: Boolean(sp?.tiktok?.accessToken?.trim()),
    youtubeRefresh: Boolean(sp?.youtube?.refreshToken?.trim()),
    linkedinToken: Boolean(sp?.linkedin?.accessToken?.trim()),
  };
}
