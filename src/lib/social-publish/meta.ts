import type { PublishResult } from "@/lib/social-publish/types";

const GRAPH = "https://graph.facebook.com/v21.0";

type MetaConfig = {
  accessToken: string;
  instagramAccountId: string;
  pageId?: string;
};

async function graphPost(path: string, body: Record<string, string>, token: string) {
  const params = new URLSearchParams({ ...body, access_token: token });
  const res = await fetch(`${GRAPH}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const json = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `Meta API ${res.status}`);
  }
  return json;
}

/** Instagram Business — tek görsel + caption */
export async function publishToInstagram(params: {
  config: MetaConfig;
  imageUrl: string;
  caption: string;
}): Promise<PublishResult> {
  const { config, imageUrl, caption } = params;
  if (!config.instagramAccountId || !config.accessToken) {
    return { ok: false, error: "Instagram hesap ID veya erişim jetonu eksik" };
  }

  try {
    const container = await graphPost(
      `/${config.instagramAccountId}/media`,
      { image_url: imageUrl, caption: caption.slice(0, 2200) },
      config.accessToken,
    );
    if (!container.id) return { ok: false, error: "Medya konteyneri oluşturulamadı" };

    const published = await graphPost(
      `/${config.instagramAccountId}/media_publish`,
      { creation_id: container.id },
      config.accessToken,
    );

    const mediaId = published.id;
    const permalinkRes = await fetch(
      `${GRAPH}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(config.accessToken)}`,
    );
    const permalinkJson = (await permalinkRes.json()) as { permalink?: string };
    const publishedUrl = permalinkJson.permalink ?? `https://www.instagram.com/p/${mediaId}/`;

    return { ok: true, publishedUrl, externalId: mediaId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Instagram yayını başarısız" };
  }
}

/** Opsiyonel Facebook sayfa fotoğrafı */
export async function publishToFacebookPage(params: {
  config: MetaConfig;
  imageUrl: string;
  message: string;
}): Promise<PublishResult> {
  const { config, imageUrl, message } = params;
  if (!config.pageId || !config.accessToken) {
    return { ok: false, error: "Facebook sayfa ID veya jeton eksik" };
  }
  try {
    const json = await graphPost(
      `/${config.pageId}/photos`,
      { url: imageUrl, message: message.slice(0, 5000) },
      config.accessToken,
    );
    const postId = json.id;
    return {
      ok: true,
      externalId: postId,
      publishedUrl: postId ? `https://www.facebook.com/${postId}` : undefined,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Facebook yayını başarısız" };
  }
}

export type InstagramMediaInsight = {
  mediaId: string;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
};

async function graphGet(path: string, token: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${GRAPH}${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`);
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !json || json.error) return null;
  return json;
}

/** Tek bir Instagram gönderisinin erişim/etkileşim metrikleri (instagram_manage_insights izni gerekir) */
export async function fetchInstagramMediaInsights(
  mediaId: string,
  config: MetaConfig,
): Promise<InstagramMediaInsight | null> {
  if (!config.accessToken || !mediaId) return null;
  const json = await graphGet(`/${mediaId}/insights?metric=reach,likes,comments,saved`, config.accessToken);
  const data = json?.data as { name?: string; values?: { value?: number }[] }[] | undefined;
  if (!data) return null;
  const valueFor = (name: string) => data.find((d) => d.name === name)?.values?.[0]?.value ?? null;
  return {
    mediaId,
    reach: valueFor("reach"),
    likes: valueFor("likes"),
    comments: valueFor("comments"),
    saved: valueFor("saved"),
  };
}

/** Hesap seviyesinde son 30 gün erişim/profil ziyareti özeti (instagram_manage_insights izni gerekir) */
export async function fetchInstagramAccountInsights(
  config: MetaConfig,
): Promise<{ impressions: number | null; reach: number | null; profileViews: number | null } | null> {
  if (!config.accessToken || !config.instagramAccountId) return null;
  const json = await graphGet(
    `/${config.instagramAccountId}/insights?metric=impressions,reach,profile_views&period=days_28`,
    config.accessToken,
  );
  const data = json?.data as { name?: string; values?: { value?: number }[] }[] | undefined;
  if (!data) return null;
  const valueFor = (name: string) => data.find((d) => d.name === name)?.values?.[0]?.value ?? null;
  return {
    impressions: valueFor("impressions"),
    reach: valueFor("reach"),
    profileViews: valueFor("profile_views"),
  };
}

export async function testMetaConnection(config: MetaConfig): Promise<{ ok: boolean; message: string }> {
  if (!config.accessToken) return { ok: false, message: "Erişim jetonu eksik" };
  if (!config.instagramAccountId) return { ok: false, message: "Instagram Business hesap ID eksik" };

  try {
    const res = await fetch(
      `${GRAPH}/${config.instagramAccountId}?fields=username,name&access_token=${encodeURIComponent(config.accessToken)}`,
    );
    const json = (await res.json()) as { username?: string; name?: string; error?: { message?: string } };
    if (!res.ok || json.error) {
      return { ok: false, message: json.error?.message ?? `HTTP ${res.status}` };
    }
    return {
      ok: true,
      message: `@${json.username ?? json.name ?? config.instagramAccountId} bağlantısı doğrulandı`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Bağlantı hatası" };
  }
}
