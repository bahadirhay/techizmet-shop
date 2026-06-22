import type { PublishResult } from "@/lib/social-publish/types";

type LinkedInConfig = {
  accessToken: string;
  authorUrn: string;
};

async function linkedInFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`https://api.linkedin.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const err = (json.message as string) || (json.status as number) || text || `HTTP ${res.status}`;
    throw new Error(String(err));
  }
  return json;
}

async function uploadImageBinary(uploadUrl: string, token: string, imageBytes: ArrayBuffer) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body: imageBytes,
  });
  if (!res.ok) throw new Error(`Görsel yükleme başarısız (${res.status})`);
}

export async function publishToLinkedIn(params: {
  config: LinkedInConfig;
  imageUrl: string;
  text: string;
}): Promise<PublishResult> {
  const { config, imageUrl, text } = params;
  if (!config.accessToken || !config.authorUrn) {
    return { ok: false, error: "LinkedIn jetonu veya yazar URN eksik" };
  }

  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return { ok: false, error: "Görsel indirilemedi (herkese açık URL gerekir)" };
    const imageBytes = await imgRes.arrayBuffer();

    const register = (await linkedInFetch("/v2/assets?action=registerUpload", config.accessToken, {
      method: "POST",
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: config.authorUrn,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      }),
    })) as {
      value?: {
        uploadMechanism?: {
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"?: { uploadUrl?: string };
        };
        asset?: string;
      };
    };

    const uploadUrl =
      register.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]
        ?.uploadUrl;
    const asset = register.value?.asset;
    if (!uploadUrl || !asset) return { ok: false, error: "LinkedIn görsel kaydı başarısız" };

    await uploadImageBinary(uploadUrl, config.accessToken, imageBytes);

    const post = (await linkedInFetch("/v2/ugcPosts", config.accessToken, {
      method: "POST",
      body: JSON.stringify({
        author: config.authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: text.slice(0, 3000) },
            shareMediaCategory: "IMAGE",
            media: [
              {
                status: "READY",
                media: asset,
              },
            ],
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    })) as { id?: string };

    const urn = post.id;
    return {
      ok: true,
      externalId: urn,
      publishedUrl: urn ? `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}/` : undefined,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "LinkedIn yayını başarısız" };
  }
}

export async function testLinkedInConnection(config: LinkedInConfig): Promise<{ ok: boolean; message: string }> {
  if (!config.accessToken) return { ok: false, message: "Erişim jetonu eksik" };
  try {
    const me = (await linkedInFetch("/v2/me", config.accessToken)) as {
      localizedFirstName?: string;
      localizedLastName?: string;
    };
    const name = [me.localizedFirstName, me.localizedLastName].filter(Boolean).join(" ");
    return { ok: true, message: name ? `${name} — jeton geçerli` : "Jeton geçerli" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Bağlantı hatası" };
  }
}
