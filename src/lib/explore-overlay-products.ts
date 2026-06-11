import { formatTry } from "@/lib/format";
import type { ExploreOverlayProduct } from "@/lib/product-explore-looks";
import { prisma } from "@/lib/prisma";

export async function loadExploreOverlayProducts(
  siteId: string,
  slugs: string[],
): Promise<Record<string, ExploreOverlayProduct>> {
  const unique = [...new Set(slugs.filter(Boolean))];
  if (!unique.length) return {};

  const rows = await prisma.storeProduct.findMany({
    where: { siteId, slug: { in: unique }, published: true },
    select: { slug: true, title: true, imageUrl: true, priceMinor: true, compareAtMinor: true },
  });

  const out: Record<string, ExploreOverlayProduct> = {};
  for (const p of rows) {
    out[p.slug] = {
      slug: p.slug,
      title: p.title,
      imageUrl: p.imageUrl,
      priceMinor: p.priceMinor,
      compareAtMinor: p.compareAtMinor,
      priceLabel: formatTry(p.priceMinor),
      compareLabel:
        p.compareAtMinor != null && p.compareAtMinor > p.priceMinor
          ? formatTry(p.compareAtMinor)
          : null,
      href: `/products/${p.slug}`,
    };
  }
  return out;
}
