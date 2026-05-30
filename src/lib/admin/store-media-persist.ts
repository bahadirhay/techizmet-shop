import { prisma } from "@/lib/prisma";
import type { SavedUpload } from "@/lib/admin/upload";

export function storeMediaPublicUrl(id: string): string {
  return `/api/media/${id}`;
}

/** Yüklenen dosyayı kaydet — disk (local) veya Neon bytea (Vercel) */
export async function persistStoreMedia(siteId: string, saved: SavedUpload) {
  if (saved.dbBuffer) {
    const row = await prisma.storeMedia.create({
      data: {
        siteId,
        filename: saved.filename,
        url: storeMediaPublicUrl("pending"),
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        data: new Uint8Array(saved.dbBuffer),
      },
    });
    const url = storeMediaPublicUrl(row.id);
    return prisma.storeMedia.update({
      where: { id: row.id },
      data: { url },
    });
  }

  return prisma.storeMedia.create({
    data: {
      siteId,
      filename: saved.filename,
      url: saved.url,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
    },
  });
}
