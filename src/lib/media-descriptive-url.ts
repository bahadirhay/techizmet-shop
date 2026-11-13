import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import { STORE_PUBLIC_REVALIDATE_SEC } from "@/lib/cache/store-cache";
import { slugify } from "@/lib/admin/slug";
import { getDefaultSite } from "@/lib/site";
import { ensureStoreTenant } from "@/lib/store-tenant";
import { storefrontListedWhere } from "@/lib/storefront-product-where";

/**
 * Açıklayıcı görsel adresleri: /gorsel/<mediaId>/<urun-adi>-1.webp
 *
 * /api/media/<id> adresi görselin ne olduğunu söylemez. Aynı dosya, adında ürün ya da
 * yazı adı geçen ikinci bir adresten de sunulur (src/app/gorsel/[mediaId]/[name]/route.ts).
 * Eski adresler çalışmaya devam eder; yalnızca vitrin HTML'i, site haritası ve
 * yapılandırılmış veri yeni adresi kullanır. Pazaryeri ve Merchant beslemeleri değişmez.
 */

/** mediaId → "dosya-adi.uzanti" */
export type MediaNameMap = Record<string, string>;

const MEDIA_ID_IN_URL_RE = /\/api\/media\/([a-z0-9]{16,40})(?![a-z0-9])/gi;
const MEDIA_ID_EXACT_RE = /^\/api\/media\/([a-z0-9]{16,40})$/i;

function mediaIdFromUrl(url: string | null | undefined): string | null {
  const path = url?.trim().split("?")[0] ?? "";
  return path.match(MEDIA_ID_EXACT_RE)?.[1] ?? null;
}

function extensionForMime(mime: string | null | undefined): string {
  const m = (mime ?? "").toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("gif")) return "gif";
  if (m.includes("avif")) return "avif";
  return "webp";
}

type MediaNameDb = ReturnType<typeof import("@/lib/prisma").getPrismaForDatabaseUrl>;

/** Ad haritasını verilen veritabanı istemcisiyle üretir (önbelleksiz; site haritası bunu kullanır) */
export async function buildMediaNameMap(db: MediaNameDb, siteId: string): Promise<MediaNameMap> {
  const [products, posts] = await Promise.all([
    db.storeProduct.findMany({
      where: { siteId, ...storefrontListedWhere },
      select: {
        title: true,
        imageUrl: true,
        images: {
          where: { mediaType: "image" },
          orderBy: { sortOrder: "asc" },
          select: { url: true },
        },
      },
    }),
    db.storeBlogPost.findMany({
      where: { siteId, published: true },
      select: { slug: true, imageUrl: true },
    }),
  ]);

  /** mediaId → uzantısız ad */
  const baseNames = new Map<string, string>();

  for (const p of products) {
    const base = slugify(p.title);
    const ids: string[] = [];
    for (const url of [p.imageUrl, ...p.images.map((i) => i.url)]) {
      const id = mediaIdFromUrl(url);
      if (id && !ids.includes(id)) ids.push(id);
    }
    ids.forEach((id, index) => {
      if (!baseNames.has(id)) baseNames.set(id, `${base}-${index + 1}`);
    });
  }

  for (const post of posts) {
    const id = mediaIdFromUrl(post.imageUrl);
    if (id && !baseNames.has(id)) baseNames.set(id, slugify(post.slug));
  }

  if (!baseNames.size) return {};

  const media = await db.storeMedia.findMany({
    where: { id: { in: [...baseNames.keys()] } },
    select: { id: true, mimeType: true },
  });

  const out: MediaNameMap = {};
  for (const m of media) {
    if (!m.mimeType?.toLowerCase().startsWith("image/")) continue;
    const base = baseNames.get(m.id);
    if (base) out[m.id] = `${base}.${extensionForMime(m.mimeType)}`;
  }
  return out;
}

/** Ürün ve blog görselleri için ad haritası (istek başına tek sefer, 5 dk önbellek) */
export const loadMediaNameMap = cache(async (): Promise<MediaNameMap> => {
  try {
    const [site, tenant] = await Promise.all([getDefaultSite(), ensureStoreTenant()]);
    const databaseUrl = tenant.databaseUrl;
    return await unstable_cache(
      async () => {
        const { getPrismaForDatabaseUrl } = await import("@/lib/prisma");
        return buildMediaNameMap(getPrismaForDatabaseUrl(databaseUrl), site.id);
      },
      ["media-name-map-v1", site.id, tenant.slug],
      { revalidate: STORE_PUBLIC_REVALIDATE_SEC, tags: ["store-products", "store-blog"] },
    )();
  } catch {
    // Ad haritası yalnızca adresi güzelleştirir; alınamazsa eski adresler kullanılır
    return {};
  }
});

/** /api/media/<id>[?…] → /gorsel/<id>/<ad>[?…]; haritada yoksa adres aynen döner */
export function descriptiveMediaUrl(url: string, names: MediaNameMap): string {
  const trimmed = url.trim();
  const [path, query] = trimmed.split("?");
  const id = path?.match(MEDIA_ID_EXACT_RE)?.[1];
  const name = id ? names[id] : undefined;
  if (!id || !name) return trimmed;
  return `/gorsel/${id}/${name}${query ? `?${query}` : ""}`;
}

/** HTML / JSON içindeki bütün /api/media/<id> geçişlerini açıklayıcı adrese çevirir */
export function rewriteMediaUrlsInText(text: string, names: MediaNameMap): string {
  if (!text || !Object.keys(names).length || !text.includes("/api/media/")) return text;
  return text.replace(MEDIA_ID_IN_URL_RE, (full, id: string) => {
    const name = names[id];
    return name ? `/gorsel/${id}/${name}` : full;
  });
}
