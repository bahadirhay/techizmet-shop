import { orderMediaForDisplay, primaryProductImageUrl } from "@/lib/product-media";

const MAX_CARD_GALLERY_IMAGES = 8;

export function imageUrlsFromProductRow(row: {
  imageUrl?: string | null;
  images?: { url: string }[];
}): string[] {
  const media = orderMediaForDisplay(
    (row.images ?? []).map((img) => ({ url: img.url, mediaType: "image" as const })),
  );
  const urls = media
    .filter((m) => m.mediaType === "image")
    .map((m) => m.url.trim())
    .filter(Boolean);
  const deduped = [...new Set(urls)].slice(0, MAX_CARD_GALLERY_IMAGES);
  if (deduped.length) return deduped;

  const legacy = row.imageUrl?.trim();
  if (!legacy) return [];
  const preferApi = legacy.includes("/api/media/") ? legacy : null;
  const fallback = row.imageUrl?.trim() || null;
  return [preferApi || fallback].filter(Boolean) as string[];
}

export function primaryImageUrlFromProductRow(row: {
  imageUrl?: string | null;
  images?: { url: string }[];
}): string | null {
  const urls = imageUrlsFromProductRow(row);
  if (urls.length) return urls[0] ?? null;

  const media = orderMediaForDisplay(
    (row.images ?? []).map((img) => ({ url: img.url, mediaType: "image" as const })),
  );
  return (
    primaryProductImageUrl(media) ||
    (row.imageUrl?.includes("/api/media/") ? row.imageUrl : null) ||
    row.imageUrl ||
    null
  );
}
