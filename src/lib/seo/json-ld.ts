import { getPublicSiteUrl, toAbsoluteMediaUrl, toAbsoluteUrl } from "@/lib/seo/site-url";

export type BreadcrumbItem = { name: string; path: string };

export function buildBreadcrumbListJsonLd(items: BreadcrumbItem[], siteOrigin?: string) {
  const origin = siteOrigin ?? getPublicSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path, origin),
    })),
  };
}

export type ProductJsonLdInput = {
  name: string;
  description?: string | null;
  sku?: string | null;
  gtin?: string | null;
  brandName?: string | null;
  imageUrls: string[];
  priceMinor: number;
  currency: string;
  inStock: boolean;
  productPath: string;
  siteName: string;
};

export function buildProductJsonLd(input: ProductJsonLdInput, siteOrigin?: string) {
  const origin = siteOrigin ?? getPublicSiteUrl();
  const images = input.imageUrls
    .map((u) => toAbsoluteMediaUrl(u, origin))
    .filter((u): u is string => Boolean(u));

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    url: toAbsoluteUrl(input.productPath, origin),
    ...(input.description?.trim() ? { description: input.description.trim().slice(0, 5000) } : {}),
    ...(images.length ? { image: images.length === 1 ? images[0] : images } : {}),
    ...(input.sku?.trim() ? { sku: input.sku.trim() } : {}),
    ...(input.gtin?.trim() ? { gtin13: input.gtin.trim() } : {}),
    ...(input.brandName?.trim()
      ? { brand: { "@type": "Brand", name: input.brandName.trim() } }
      : {}),
    offers: {
      "@type": "Offer",
      url: toAbsoluteUrl(input.productPath, origin),
      priceCurrency: input.currency,
      price: (input.priceMinor / 100).toFixed(2),
      itemCondition: "https://schema.org/NewCondition",
      availability: input.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: input.siteName },
    },
  };

  return schema;
}

export type CollectionJsonLdInput = {
  name: string;
  description?: string | null;
  collectionPath: string;
  siteName: string;
};

export function buildCollectionPageJsonLd(input: CollectionJsonLdInput, siteOrigin?: string) {
  const origin = siteOrigin ?? getPublicSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    url: toAbsoluteUrl(input.collectionPath, origin),
    ...(input.description?.trim() ? { description: input.description.trim().slice(0, 2000) } : {}),
    isPartOf: {
      "@type": "WebSite",
      name: input.siteName,
      url: origin,
    },
  };
}

export type FaqJsonLdItem = { question: string; answer: string };

export function buildFaqPageJsonLd(
  items: FaqJsonLdItem[],
  pageUrl: string,
  siteOrigin?: string,
) {
  const origin = siteOrigin ?? getPublicSiteUrl();
  const url = toAbsoluteUrl(pageUrl, origin);
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
    url,
  };
}

export type ItemListProductJsonLd = {
  name: string;
  url: string;
  image?: string;
  priceMinor: number;
  currency: string;
};

export function buildItemListJsonLd(
  items: ItemListProductJsonLd[],
  listName: string,
  pageUrl: string,
  siteOrigin?: string,
) {
  const origin = siteOrigin ?? getPublicSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    url: toAbsoluteUrl(pageUrl, origin),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: item.name,
        url: toAbsoluteUrl(item.url, origin),
        ...(item.image ? { image: toAbsoluteMediaUrl(item.image, origin) } : {}),
        offers: {
          "@type": "Offer",
          price: (item.priceMinor / 100).toFixed(2),
          priceCurrency: item.currency,
        },
      },
    })),
  };
}
