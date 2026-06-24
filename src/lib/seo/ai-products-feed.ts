import "server-only";

import { htmlToPlainText } from "@/lib/html-plain-text";
import { getPublicSiteUrl, toAbsoluteMediaUrl } from "@/lib/seo/site-url";
import { parseGoogleMerchantSettings } from "@/lib/seo/google-merchant-types";
import type { GoogleMerchantSettings } from "@/lib/seo/google-merchant-types";
import { prisma } from "@/lib/prisma";

export type AiProductFeedItem = {
  id: string;
  slug: string;
  title: string;
  url: string;
  description: string;
  price: number;
  salePrice?: number;
  currency: string;
  availability: "in_stock" | "out_of_stock";
  brand?: string;
  category?: string;
  image?: string;
  images: string[];
  sku?: string;
  gtin?: string;
  weightGrams?: number;
};

export type AiProductsFeed = {
  generatedAt: string;
  site: { name: string; url: string; description?: string };
  currency: string;
  productCount: number;
  products: AiProductFeedItem[];
};

function plainDescription(title: string, description: string | null, descriptionHtml: string | null): string {
  const fromHtml = descriptionHtml ? htmlToPlainText(descriptionHtml) : "";
  const plain = description?.trim() || fromHtml || title;
  return plain.replace(/\s+/g, " ").trim();
}

function normalizeGtin(barcode: string | null | undefined): string | undefined {
  const digits = (barcode ?? "").replace(/\D/g, "");
  if (digits.length === 8 || digits.length === 12 || digits.length === 13 || digits.length === 14) {
    return digits;
  }
  return undefined;
}

export async function loadAiProductFeedItems(
  siteId: string,
  currency = "TRY",
): Promise<AiProductFeedItem[]> {
  const origin = getPublicSiteUrl();
  const rows = await prisma.storeProduct.findMany({
    where: { siteId, published: true },
    orderBy: { title: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      descriptionHtml: true,
      sku: true,
      barcode: true,
      priceMinor: true,
      compareAtMinor: true,
      stockQty: true,
      weightGrams: true,
      imageUrl: true,
      brand: { select: { name: true } },
      category: { select: { title: true } },
      images: {
        where: { mediaType: "image" },
        orderBy: { sortOrder: "asc" },
        take: 5,
        select: { url: true },
      },
      variants: {
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        select: { priceMinor: true, compareAtMinor: true, stockQty: true },
        take: 1,
      },
    },
  });

  const items: AiProductFeedItem[] = [];

  for (const p of rows) {
    const imageCandidates = [p.imageUrl, ...p.images.map((i) => i.url)];
    const images = imageCandidates
      .map((u) => toAbsoluteMediaUrl(u, origin))
      .filter((u): u is string => Boolean(u));
    const primaryImage = images[0];

    const variant = p.variants[0];
    const priceMinor = variant?.priceMinor ?? p.priceMinor;
    const compareAt = variant?.compareAtMinor ?? p.compareAtMinor;
    const onSale = compareAt && compareAt > priceMinor;
    const inStock = (variant?.stockQty ?? p.stockQty) > 0;

    items.push({
      id: p.slug,
      slug: p.slug,
      title: p.title,
      url: `${origin}/products/${p.slug}`,
      description: plainDescription(p.title, p.description, p.descriptionHtml),
      price: (onSale ? compareAt! : priceMinor) / 100,
      salePrice: onSale ? priceMinor / 100 : undefined,
      currency,
      availability: inStock ? "in_stock" : "out_of_stock",
      brand: p.brand?.name?.trim() || undefined,
      category: p.category?.title?.trim() || undefined,
      image: primaryImage,
      images,
      sku: p.sku?.trim() || undefined,
      gtin: normalizeGtin(p.barcode),
      weightGrams: p.weightGrams ?? undefined,
    });
  }

  return items;
}

export async function buildAiProductsFeed(
  siteId: string,
  siteName: string,
  siteDescription?: string | null,
  gmc?: GoogleMerchantSettings,
): Promise<AiProductsFeed> {
  const config = parseGoogleMerchantSettings(gmc, siteName);
  const products = await loadAiProductFeedItems(siteId, config.currency);
  return {
    generatedAt: new Date().toISOString(),
    site: {
      name: siteName,
      url: getPublicSiteUrl(),
      description: siteDescription?.trim() || undefined,
    },
    currency: config.currency,
    productCount: products.length,
    products,
  };
}

export function aiProductsFeedPath(): string {
  return "/feeds/products.json";
}

export function aiProductsFeedUrl(): string {
  return `${getPublicSiteUrl()}${aiProductsFeedPath()}`;
}
