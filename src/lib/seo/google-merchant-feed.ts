import "server-only";

import { htmlToPlainText } from "@/lib/html-plain-text";
import {
  parseGoogleMerchantSettings,
  type GoogleMerchantSettings,
  type ResolvedGoogleMerchantConfig,
} from "@/lib/seo/google-merchant-types";
import { getPublicSiteUrl, toAbsoluteMediaUrl } from "@/lib/seo/site-url";
import { prisma } from "@/lib/prisma";
import { storefrontListedWhere } from "@/lib/storefront-product-where";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function googleMoney(minor: number, currency: string): string {
  return `${(minor / 100).toFixed(2)} ${currency}`;
}

function truncate(value: string, max: number): string {
  const v = value.trim();
  if (v.length <= max) return v;
  return `${v.slice(0, max - 1)}…`;
}

type FeedItem = {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImages: string[];
  priceMinor: number;
  salePriceMinor?: number;
  inStock: boolean;
  brand: string;
  gtin?: string;
  mpn?: string;
  productType?: string;
  itemGroupId?: string;
};

function productDescription(title: string, description: string | null, descriptionHtml: string | null): string {
  const fromHtml = descriptionHtml ? htmlToPlainText(descriptionHtml) : "";
  const plain = description?.trim() || fromHtml || title;
  const cleaned = plain.replace(/\s+/g, " ").trim();
  if (cleaned.length >= 120) return truncate(cleaned, 5000);
  return truncate(
    `${cleaned}. ${title} — doğal içerik, güvenilir tedarik. Detaylı ürün bilgisi için mağaza sayfasını ziyaret edin.`,
    5000,
  );
}

function resolveImageUrl(
  imageUrl: string | null | undefined,
  images: { url: string }[],
  siteOrigin: string,
): string | null {
  const candidates = [imageUrl, ...images.map((i) => i.url)];
  for (const raw of candidates) {
    const abs = toAbsoluteMediaUrl(raw, siteOrigin);
    if (abs?.startsWith("https://")) return abs;
    if (abs?.startsWith("http://")) return abs.replace(/^http:/, "https:");
  }
  return null;
}

function normalizeGtin(barcode: string | null | undefined): string | undefined {
  const digits = (barcode ?? "").replace(/\D/g, "");
  if (digits.length === 8 || digits.length === 12 || digits.length === 13 || digits.length === 14) {
    return digits;
  }
  return undefined;
}

export async function loadGoogleMerchantFeedItems(siteId: string): Promise<FeedItem[]> {
  const siteOrigin = getPublicSiteUrl();
  const rows = await prisma.storeProduct.findMany({
    where: { siteId, ...storefrontListedWhere },
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
      imageUrl: true,
      brand: { select: { name: true } },
      category: { select: { title: true } },
      images: {
        where: { mediaType: "image" },
        orderBy: { sortOrder: "asc" },
        take: 10,
        select: { url: true },
      },
      variants: {
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        select: {
          id: true,
          label: true,
          sku: true,
          priceMinor: true,
          compareAtMinor: true,
          stockQty: true,
        },
      },
    },
  });

  const items: FeedItem[] = [];

  for (const p of rows) {
    const imageLink = resolveImageUrl(p.imageUrl, p.images, siteOrigin);
    if (!imageLink) continue;

    const description = productDescription(p.title, p.description, p.descriptionHtml);
    const brand = p.brand?.name?.trim() || "";
    const productType = p.category?.title?.trim() || undefined;
    const link = `${siteOrigin}/products/${p.slug}`;
    const additionalImages = p.images
      .map((i) => toAbsoluteMediaUrl(i.url, siteOrigin))
      .filter((u): u is string => Boolean(u && u !== imageLink))
      .slice(0, 9);

    const baseGtin = normalizeGtin(p.barcode);
    const baseMpn = p.sku?.trim() || p.slug;

    if (p.variants.length > 0) {
      for (const v of p.variants) {
        const variantImage = imageLink;
        const title = truncate(`${p.title} — ${v.label}`, 150);
        const priceMinor = v.priceMinor;
        const compareAt = v.compareAtMinor && v.compareAtMinor > priceMinor ? v.compareAtMinor : p.compareAtMinor;
        const onSale = compareAt && compareAt > priceMinor;
        items.push({
          id: `${p.slug}__${v.id}`,
          title,
          description,
          link,
          imageLink: variantImage,
          additionalImages,
          priceMinor: onSale ? compareAt! : priceMinor,
          salePriceMinor: onSale ? priceMinor : undefined,
          inStock: v.stockQty > 0 || p.stockQty > 0,
          brand,
          gtin: baseGtin,
          mpn: v.sku?.trim() || baseMpn,
          productType,
          itemGroupId: p.slug,
        });
      }
      continue;
    }

    const onSale = p.compareAtMinor && p.compareAtMinor > p.priceMinor;
    items.push({
      id: p.slug,
      title: truncate(p.title, 150),
      description,
      link,
      imageLink,
      additionalImages,
      priceMinor: onSale ? p.compareAtMinor! : p.priceMinor,
      salePriceMinor: onSale ? p.priceMinor : undefined,
      inStock: p.stockQty > 0,
      brand,
      gtin: baseGtin,
      mpn: baseMpn,
      productType,
    });
  }

  return items;
}

function itemXml(item: FeedItem, config: ResolvedGoogleMerchantConfig): string {
  const brand = item.brand || config.defaultBrand;
  const lines = [
    "    <item>",
    `      <title>${escapeXml(item.title)}</title>`,
    `      <link>${escapeXml(item.link)}</link>`,
    `      <description>${escapeXml(item.description)}</description>`,
    `      <g:id>${escapeXml(item.id)}</g:id>`,
    `      <g:title>${escapeXml(item.title)}</g:title>`,
    `      <g:description>${escapeXml(item.description)}</g:description>`,
    `      <g:link>${escapeXml(item.link)}</g:link>`,
    `      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>`,
    `      <g:condition>${config.condition}</g:condition>`,
    `      <g:availability>${item.inStock ? "in_stock" : "out_of_stock"}</g:availability>`,
    `      <g:price>${googleMoney(item.priceMinor, config.currency)}</g:price>`,
    `      <g:brand>${escapeXml(brand)}</g:brand>`,
  ];

  if (item.salePriceMinor !== undefined && item.salePriceMinor < item.priceMinor) {
    lines.push(`      <g:sale_price>${googleMoney(item.salePriceMinor, config.currency)}</g:sale_price>`);
  }
  if (item.gtin) {
    lines.push(`      <g:gtin>${escapeXml(item.gtin)}</g:gtin>`);
  } else {
    lines.push("      <g:identifier_exists>false</g:identifier_exists>");
    if (item.mpn) lines.push(`      <g:mpn>${escapeXml(item.mpn)}</g:mpn>`);
  }
  if (config.googleProductCategory) {
    lines.push(`      <g:google_product_category>${escapeXml(config.googleProductCategory)}</g:google_product_category>`);
  }
  if (item.productType) {
    lines.push(`      <g:product_type>${escapeXml(item.productType)}</g:product_type>`);
  }
  if (item.itemGroupId) {
    lines.push(`      <g:item_group_id>${escapeXml(item.itemGroupId)}</g:item_group_id>`);
  }
  for (const img of item.additionalImages) {
    lines.push(`      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`);
  }
  lines.push(
    `      <g:shipping>`,
    `        <g:country>${escapeXml(config.shippingCountry)}</g:country>`,
    `        <g:service>Standard</g:service>`,
    `        <g:price>${googleMoney(config.shippingPriceMinor, config.currency)}</g:price>`,
    `      </g:shipping>`,
    "    </item>",
  );
  return lines.join("\n");
}

export function buildGoogleMerchantFeedXml(params: {
  siteName: string;
  siteUrl: string;
  feedUrl: string;
  items: FeedItem[];
  config: ResolvedGoogleMerchantConfig;
}): string {
  const { siteName, siteUrl, feedUrl, items, config } = params;
  const itemBlocks = items.map((item) => itemXml(item, config)).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(`${siteName} ürün kataloğu — Google Merchant Center`)}</description>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/xml" />
${itemBlocks}
  </channel>
</rss>`;
}

export function googleMerchantFeedPath(token?: string): string {
  const base = "/feeds/google-merchant.xml";
  if (!token?.trim()) return base;
  return `${base}?token=${encodeURIComponent(token.trim())}`;
}

export function googleMerchantFeedUrl(token?: string): string {
  return `${getPublicSiteUrl()}${googleMerchantFeedPath(token)}`;
}

export async function buildGoogleMerchantFeedForSite(
  siteId: string,
  siteName: string,
  settings?: GoogleMerchantSettings,
): Promise<{ xml: string; itemCount: number; config: ResolvedGoogleMerchantConfig }> {
  const config = parseGoogleMerchantSettings(settings, siteName);
  const items = await loadGoogleMerchantFeedItems(siteId);
  const siteUrl = getPublicSiteUrl();
  const feedUrl = googleMerchantFeedUrl(config.feedToken || undefined);
  const xml = buildGoogleMerchantFeedXml({
    siteName,
    siteUrl,
    feedUrl,
    items,
    config,
  });
  return { xml, itemCount: items.length, config };
}
