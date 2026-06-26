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

export type ProductReviewJsonLd = {
  author: string;
  rating: number;
  body: string;
  title?: string | null;
  datePublished: string;
};

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
  /** Yalnızca gerçek, onaylı yorumlardan üretilmeli (uydurma puan = Google cezası) */
  aggregateRating?: { ratingValue: number; reviewCount: number } | null;
  reviews?: ProductReviewJsonLd[];
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

  if (input.aggregateRating && input.aggregateRating.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.aggregateRating.ratingValue.toFixed(1),
      reviewCount: input.aggregateRating.reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  if (input.reviews?.length) {
    schema.review = input.reviews.slice(0, 20).map((r) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: String(r.rating),
        bestRating: "5",
        worstRating: "1",
      },
      author: { "@type": "Person", name: r.author },
      ...(r.title?.trim() ? { name: r.title.trim() } : {}),
      reviewBody: r.body,
      datePublished: r.datePublished.slice(0, 10),
    }));
  }

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
