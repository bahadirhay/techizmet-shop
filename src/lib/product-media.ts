import { detectEmbedProvider } from "@/lib/video-embed";

export type ProductMediaType = "image" | "video";

export type ProductMediaItem = {
  url: string;
  mediaType: ProductMediaType;
};

const VIDEO_EXT = /\.(mp4|webm|mov)(\?|$)/i;

export function inferMediaType(url: string): ProductMediaType {
  const trimmed = url.trim();
  if (detectEmbedProvider(trimmed)) return "video";
  return VIDEO_EXT.test(trimmed) ? "video" : "image";
}

export function normalizeMediaItem(raw: { url?: string; mediaType?: string }): ProductMediaItem | null {
  const url = raw.url?.trim();
  if (!url) return null;
  const mediaType = raw.mediaType === "video" ? "video" : inferMediaType(url);
  return { url, mediaType };
}

export function primaryProductImageUrl(items: ProductMediaItem[]): string | null {
  const image = items.find((m) => m.mediaType === "image");
  return image?.url ?? items[0]?.url ?? null;
}

/** Vitrin/mirror için göreli medya yollarını tam URL yapar */
/** Canlıda /uploads dosyaları yok — /api/media önce gelsin */
export function orderMediaForDisplay(items: ProductMediaItem[]): ProductMediaItem[] {
  if (!items.length) return items;
  const isServerless =
    process.env.VERCEL === "1" || process.cwd().startsWith("/var/task");
  if (!isServerless) return items;

  const api: ProductMediaItem[] = [];
  const uploads: ProductMediaItem[] = [];
  const rest: ProductMediaItem[] = [];
  for (const item of items) {
    if (item.url.includes("/api/media/")) api.push(item);
    else if (item.url.startsWith("/uploads/")) uploads.push(item);
    else rest.push(item);
  }
  return [...api, ...rest, ...uploads];
}

function sameOriginMediaPath(pathname: string, search = ""): string | null {
  if (pathname.startsWith("/api/media/") || pathname.startsWith("/uploads/")) {
    return pathname + search;
  }
  return null;
}

/** Vitrin img/video src — göreli yol kullanır (www vs apex uyumu) */
export function resolvePublicMediaUrl(url: string, origin?: string): string {
  const raw = url.trim();
  if (!raw) return raw;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const relative = sameOriginMediaPath(parsed.pathname, parsed.search);
      if (relative) return relative;
    } catch {
      /* keep absolute */
    }
    return raw;
  }

  if (raw.startsWith("/")) return raw;

  const base =
    origin?.replace(/\/$/, "") ||
    (typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_STORE_URL || "http://localhost:5555").replace(
          /\/$/,
          "",
        ));
  return `${base}/${raw}`;
}

export function parseProductMediaInput(body: Record<string, unknown>): ProductMediaItem[] | null {
  if (Array.isArray(body.mediaItems)) {
    const items = body.mediaItems
      .map((row) => normalizeMediaItem(row as { url?: string; mediaType?: string }))
      .filter((m): m is ProductMediaItem => m != null);
    return items;
  }
  if (Array.isArray(body.imageUrls)) {
    return body.imageUrls
      .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      .map((url) => ({ url: url.trim(), mediaType: inferMediaType(url) }));
  }
  return null;
}
