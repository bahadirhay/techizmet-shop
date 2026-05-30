import type { Prisma } from "@prisma/client";
import { primaryProductImageUrl, type ProductMediaItem } from "@/lib/product-media";

export async function syncProductMedia(
  tx: Prisma.TransactionClient,
  productId: string,
  mediaItems: ProductMediaItem[],
): Promise<string | null> {
  await tx.storeProductImage.deleteMany({ where: { productId } });
  if (mediaItems.length > 0) {
    await tx.storeProductImage.createMany({
      data: mediaItems.map((m, i) => ({
        productId,
        url: m.url,
        mediaType: m.mediaType,
        sortOrder: i,
      })),
    });
  }
  return primaryProductImageUrl(mediaItems);
}
