import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { join } from "node:path";
import type { Prisma, PrismaClient } from "@prisma/client";
import { persistStoreMedia, storeMediaPublicUrl } from "@/lib/admin/store-media-persist";
import { inferMediaType, type ProductMediaItem } from "@/lib/product-media";

type Db = PrismaClient | Prisma.TransactionClient;

function mimeFromFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  return "image/jpeg";
}

async function readLocalUpload(url: string): Promise<Buffer | null> {
  const path = url.split("?")[0]?.trim();
  if (!path?.startsWith("/uploads/")) return null;
  try {
    return await readFile(join(process.cwd(), "public", path.replace(/^\//, "")));
  } catch {
    return null;
  }
}

/** Yerel /uploads yolunu Neon /api/media kaydına taşır — Vercel uyumluluğu */
export async function migrateUploadUrlToApiMedia(
  db: Db,
  siteId: string,
  url: string,
): Promise<string> {
  const raw = url.trim();
  if (!raw.startsWith("/uploads/")) return raw;

  const existing = await db.storeMedia.findFirst({
    where: { siteId, url: raw },
    select: { id: true, data: true },
  });
  if (existing?.data?.length) return storeMediaPublicUrl(existing.id);

  const buf = await readLocalUpload(raw);
  if (!buf?.length) return raw;

  const filename = basename(raw);
  if (existing) {
    const apiUrl = storeMediaPublicUrl(existing.id);
    await db.storeMedia.update({
      where: { id: existing.id },
      data: {
        data: new Uint8Array(buf),
        sizeBytes: buf.length,
        mimeType: mimeFromFilename(filename),
        url: apiUrl,
      },
    });
    return apiUrl;
  }

  const row = await persistStoreMedia(siteId, {
    url: "",
    filename,
    mimeType: mimeFromFilename(filename),
    sizeBytes: buf.length,
    dbBuffer: buf,
  });
  return row.url;
}

export async function migrateUploadMediaItem(
  db: Db,
  siteId: string,
  item: ProductMediaItem,
): Promise<ProductMediaItem> {
  const nextUrl = await migrateUploadUrlToApiMedia(db, siteId, item.url);
  const mediaType: ProductMediaItem["mediaType"] =
    item.mediaType === "video" || inferMediaType(nextUrl) === "video" ? "video" : "image";
  return { url: nextUrl, mediaType };
}
