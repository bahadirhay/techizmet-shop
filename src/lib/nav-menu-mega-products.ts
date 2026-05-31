import { formatTry } from "@/lib/format";
import type { MegaNavProduct } from "@/lib/mirror-nav-resolve";
import { productHref } from "@/lib/nav-menu-link";
import { prisma } from "@/lib/prisma";

export async function resolveMegaMenuProductsBySlug(
  siteId: string,
  slugs: string[],
): Promise<Map<string, MegaNavProduct>> {
  const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (!unique.length) return new Map();

  const rows = await prisma.storeProduct.findMany({
    where: { siteId, published: true, slug: { in: unique } },
    select: {
      slug: true,
      title: true,
      priceMinor: true,
      compareAtMinor: true,
      imageUrl: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });

  const map = new Map<string, MegaNavProduct>();
  for (const p of rows) {
    const imageUrl = p.imageUrl?.trim() || p.images[0]?.url?.trim() || "";
    map.set(p.slug, {
      href: productHref(p.slug),
      title: p.title,
      imageUrl,
      priceLabel: formatTry(p.priceMinor),
      compareLabel: p.compareAtMinor ? formatTry(p.compareAtMinor) : null,
    });
  }
  return map;
}
