import "server-only";

import { formatTry } from "@/lib/format";
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
    .filter((f) => f.product.siteId === site.id && f.product.published)
    .map((f) => ({
      productId: f.product.id,
      slug: f.product.slug,
      title: f.product.title,
      imageUrl: f.product.imageUrl,
      priceLabel: formatTry(f.product.priceMinor),
    }));

  return { items, locale };
}
