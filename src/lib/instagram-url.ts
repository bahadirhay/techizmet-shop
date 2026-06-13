/** Gönderi / reel permalink'ini kanonik forma çevirir */
export function normalizeInstagramPermalink(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (!url.hostname.toLowerCase().includes("instagram.com")) return null;
    const path = url.pathname.replace(/\/+$/, "");
    if (!path || path === "") return null;
    return `https://www.instagram.com${path}`;
  } catch {
    return null;
  }
}

export function isInstagramReelPermalink(permalink: string): boolean {
  return /\/(reel|reels)\//i.test(permalink);
}

export function extractInstagramShortcodeFromPermalink(permalink: string): string | null {
  const m = permalink.match(/\/(?:p|reel|reels)\/([^/?#]+)/i);
  return m?.[1] ?? null;
}

export type InstagramOembedPayload = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
};

export async function fetchInstagramOembed(permalink: string): Promise<InstagramOembedPayload | null> {
  const url = `https://api.instagram.com/oembed?url=${encodeURIComponent(permalink)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return (await res.json()) as InstagramOembedPayload;
  } catch {
    return null;
  }
}

export function instagramOembedToPostPatch(
  permalink: string,
  oembed: InstagramOembedPayload | null,
  existing?: {
    caption?: string | null;
    title?: string | null;
    thumbnailUrl?: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
  },
): {
  caption?: string | null;
  title?: string | null;
  thumbnailUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
} {
  const patch: {
    caption?: string | null;
    title?: string | null;
    thumbnailUrl?: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
  } = {};

  const thumb = oembed?.thumbnail_url?.trim();
  if (thumb && !existing?.thumbnailUrl?.trim()) patch.thumbnailUrl = thumb;
  if (thumb && !existing?.mediaUrl?.trim()) patch.mediaUrl = thumb;

  const oTitle = oembed?.title?.trim();
  if (oTitle && !existing?.caption?.trim()) patch.caption = oTitle;
  if (oTitle && !existing?.title?.trim()) patch.title = oTitle.slice(0, 200);

  const reel = isInstagramReelPermalink(permalink);
  if (!existing?.mediaType?.trim()) patch.mediaType = reel ? "VIDEO" : "IMAGE";

  return patch;
}
