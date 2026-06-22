import type { PublishResult } from "@/lib/social-publish/types";

type YouTubeConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  channelId?: string;
};

export async function refreshYouTubeAccessToken(config: YouTubeConfig): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? "YouTube jeton yenileme başarısız");
  }
  return json.access_token;
}

/**
 * YouTube Shorts otomatik yükleme video dosyası gerektirir.
 * Metinleri hazırlar; kullanıcı Studio'dan yükler.
 */
export async function publishToYouTube(_params: {
  config: YouTubeConfig;
  title: string;
  description: string;
}): Promise<PublishResult> {
  return {
    ok: false,
    manualOnly: true,
    error:
      "YouTube Shorts otomatik yayın için video dosyası gerekir. Başlık ve açıklamayı kopyalayıp YouTube Studio'dan yükleyin.",
  };
}

export async function testYouTubeConnection(config: YouTubeConfig): Promise<{ ok: boolean; message: string }> {
  if (!config.clientId || !config.clientSecret || !config.refreshToken) {
    return { ok: false, message: "OAuth client ID, secret ve refresh token gerekli" };
  }
  try {
    const accessToken = await refreshYouTubeAccessToken(config);
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const json = (await res.json()) as {
      items?: Array<{ id?: string; snippet?: { title?: string } }>;
      error?: { message?: string };
    };
    if (!res.ok || json.error) {
      return { ok: false, message: json.error?.message ?? `HTTP ${res.status}` };
    }
    const ch = json.items?.[0];
    const title = ch?.snippet?.title ?? "Kanal";
    return {
      ok: true,
      message: `${title}${ch?.id ? ` (${ch.id})` : ""} — OAuth geçerli (video yükleme manuel)`,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Bağlantı hatası" };
  }
}
