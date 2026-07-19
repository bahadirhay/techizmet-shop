import "server-only";

import { formatTry } from "@/lib/format";
import { formatProductDisplayTitle } from "@/lib/product-display-title";
import type { ShopLocale } from "@/lib/i18n/locale";
import type { MirrorFavoritesPayload } from "@/lib/mirror-favorites-page";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

export async function loadMirrorFavoritesPayload(
  customerId: string,
  locale: ShopLocale,
): Promise<MirrorFavoritesPayload> {
  const site = await getDefaultSite();
  const favorites = await prisma.customerFavorite.findMany({
    where: { customerId },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  const items = favorites
    .filter((f) => f.product.siteId === site.id && f.product.published && f.product.storeVisible)
    .map((f) => ({
      productId: f.product.id,
      slug: f.product.slug,
      title: formatProductDisplayTitle({
        title: f.product.title,
        weightGrams: f.product.weightGrams,
        pieceCount: f.product.pieceCount,
      }),
      imageUrl: f.product.imageUrl,
      priceLabel: formatTry(f.product.priceMinor),
      compareLabel:
        f.product.compareAtMinor != null && f.product.compareAtMinor > f.product.priceMinor
          ? formatTry(f.product.compareAtMinor)
          : null,
    }));

  return { items, locale };
}
