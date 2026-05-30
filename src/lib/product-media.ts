export type ProductMediaType = "image" | "video";

export type ProductMediaItem = {
  url: string;
  mediaType: ProductMediaType;
};

const VIDEO_EXT = /\.(mp4|webm|mov)(\?|$)/i;

export function inferMediaType(url: string): ProductMediaType {
  return VIDEO_EXT.test(url.trim()) ? "video" : "image";
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
