import type { PublishResult } from "@/lib/social-publish/types";

type TikTokConfig = {
  accessToken: string;
  openId?: string;
};

async function tiktokFetch(path: string, token: string, body: Record<string, unknown>) {
  const res = await fetch(`https://open.tiktokapis.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    data?: { publish_id?: string; status?: string; fail_reason?: string };
    error?: { code?: string; message?: string };
  };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? `TikTok API ${res.status}`);
  }
  return json;
}

async function waitForTikTokPublish(token: string, publishId: string, maxAttempts = 12) {
  for (let i = 0; i < maxAttempts; i += 1) {
    await new Promise((r) => setTimeout(r, 2500));
    const status = await tiktokFetch("/v2/post/publish/status/fetch/", token, { publish_id: publishId });
    const state = status.data?.status;
    if (state === "PUBLISH_COMPLETE") return status;
    if (state === "FAILED") {
      throw new Error(status.data?.fail_reason ?? "TikTok yayını başarısız");
    }
  }
  throw new Error("TikTok yayın durumu zaman aşımı");
}

/** TikTok fotoğraf gönderisi — PULL_FROM_URL */
export async function publishToTikTok(params: {
  config: TikTokConfig;
  imageUrls: string[];
  title: string;
  description: string;
}): Promise<PublishResult> {
  const { config, imageUrls, title, description } = params;
  if (!config.accessToken) return { ok: false, error: "TikTok erişim jetonu eksik" };

  const photos = imageUrls.slice(0, 35);
  if (!photos.length) return { ok: false, error: "Yayın için en az bir görsel gerekir" };

  try {
    const init = await tiktokFetch("/v2/post/publish/content/init/", config.accessToken, {
      post_info: {
        title: title.slice(0, 90),
        description: description.slice(0, 4000),
        disable_comment: false,
        privacy_level: "PUBLIC_TO_EVERYONE",
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: photos,
      },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    });

    const publishId = init.data?.publish_id;
    if (!publishId) return { ok: false, error: "TikTok publish_id alınamadı" };

    await waitForTikTokPublish(config.accessToken, publishId);

    return {
      ok: true,
      externalId: publishId,
      publishedUrl: "https://www.tiktok.com/",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "TikTok yayını başarısız" };
  }
}

export async function testTikTokConnection(config: TikTokConfig): Promise<{ ok: boolean; message: string }> {
  if (!config.accessToken) return { ok: false, message: "Erişim jetonu eksik" };
  try {
    const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name,open_id", {
      headers: { Authorization: `Bearer ${config.accessToken}` },
    });
    const json = (await res.json()) as {
      data?: { user?: { display_name?: string } };
      error?: { message?: string };
    };
    if (!res.ok || json.error) {
      return { ok: false, message: json.error?.message ?? `HTTP ${res.status}` };
    }
    const name = json.data?.user?.display_name ?? "TikTok";
    return { ok: true, message: `${name} — jeton geçerli` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Bağlantı hatası" };
  }
}
