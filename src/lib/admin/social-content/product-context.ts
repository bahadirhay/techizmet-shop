import "server-only";

import { formatTry } from "@/lib/admin/money";
import { htmlToPlainText } from "@/lib/product-content-format";
import { primaryImageUrlFromProductRow } from "@/lib/mirror-product-card-images";
import { prisma } from "@/lib/prisma";

export type SocialProductContext = {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceLabel: string;
  compareAtLabel: string | null;
  imageUrls: string[];
  categoryTitle: string | null;
  brandTitle: string | null;
  campaignNote: string | null;
};

export async function loadSocialProductContext(
  siteId: string,
  productId: string,
): Promise<SocialProductContext | null> {
  const product = await prisma.storeProduct.findFirst({
    where: { id: productId, siteId, published: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      descriptionHtml: true,
      priceMinor: true,
      compareAtMinor: true,
      imageUrl: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, mediaType: true } },
      category: { select: { title: true } },
      brand: { select: { title: true } },
    },
  });
  if (!product) return null;

  const imageUrls = product.images
    .filter((i) => i.mediaType !== "video")
    .map((i) => i.url);
  const primary = primaryImageUrlFromProductRow(product);
  const media = [...new Set([primary, ...imageUrls].filter(Boolean))] as string[];

  const desc =
    product.description?.trim() ||
    htmlToPlainText(product.descriptionHtml ?? "").trim() ||
    "";

  const campaignNote = await loadActiveCampaignNote(siteId);

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: desc.slice(0, 600),
    priceLabel: formatTry(product.priceMinor),
    compareAtLabel: product.compareAtMinor ? formatTry(product.compareAtMinor) : null,
    imageUrls: media,
    categoryTitle: product.category?.title ?? null,
    brandTitle: product.brand?.title ?? null,
    campaignNote,
  };
}

async function loadActiveCampaignNote(siteId: string): Promise<string | null> {
  const campaigns = await prisma.storeCampaign.findMany({
    where: { siteId, active: true, autoApply: true },
    select: { name: true, type: true, percentOff: true, minCartMinor: true },
    take: 5,
  });
  if (!campaigns.length) return null;
  return campaigns
    .map((c) => {
      if (c.minCartMinor) {
        return `${(c.minCartMinor / 100).toFixed(0)} TL+ %${c.percentOff ?? 0} (${c.name})`;
      }
      return c.name;
    })
    .join(" · ");
}
