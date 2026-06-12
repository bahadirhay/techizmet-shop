import type { Prisma, PrismaClient } from "@prisma/client";
import { migrateUploadMediaItem } from "@/lib/admin/migrate-upload-media";
import {
  orderMediaForDisplay,
  primaryProductImageUrl,
  type ProductMediaItem,
} from "@/lib/product-media";

type ProductDb = Prisma.TransactionClient | PrismaClient;

export async function syncProductMedia(
  tx: ProductDb,
  productId: string,
  mediaItems: ProductMediaItem[],
  siteId?: string,
): Promise<string | null> {
  let normalized = [...mediaItems];
  if (siteId) {
    normalized = await Promise.all(
      mediaItems.map((m) => migrateUploadMediaItem(tx, siteId, m)),
    );
  }
  normalized = orderMediaForDisplay(normalized);

  await tx.storeProductImage.deleteMany({ where: { productId } });
  if (normalized.length > 0) {
    await tx.storeProductImage.createMany({
      data: normalized.map((m, i) => ({
        productId,
        url: m.url,
        mediaType: m.mediaType,
        sortOrder: i,
      })),
    });
  }
  return primaryProductImageUrl(normalized);
}
