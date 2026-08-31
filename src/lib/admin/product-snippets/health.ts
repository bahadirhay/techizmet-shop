import "server-only";

import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { LANDING_COLLECTION_SLUGS } from "@/lib/seo/search-intent";
import { storefrontListedWhere } from "@/lib/storefront-product-where";

export type ProductSnippetHealthFinding = {
  severity: "fail" | "warn" | "ok";
  code: string;
  title: string;
  detail: string;
  path?: string;
  fixHint?: string;
};

export type ProductSnippetHealthProductRow = {
  id: string;
  slug: string;
  title: string;
  path: string;
  approvedReviewCount: number;
  hasAggregateRatingOnPdp: boolean;
};

export type ProductSnippetHealthResult = {
  scannedAt: string;
  siteUrl: string;
  summary: {
    collectionUrlsChecked: number;
    nestedProductOnCollections: number;
    productsWithoutReviews: number;
    productsWithReviews: number;
    publishedProducts: number;
  };
  findings: ProductSnippetHealthFinding[];
  productsMissingReviews: ProductSnippetHealthProductRow[];
  gscSteps: string[];
};

function extractLdJsonBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      /* ignore broken blocks */
    }
  }
  return blocks;
}

function flattenNodes(node: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const item of node) flattenNodes(item, out);
    return out;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    out.push(obj);
    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") flattenNodes(value, out);
    }
  }
  return out;
}

function countNestedProducts(html: string): number {
  let count = 0;
  for (const block of extractLdJsonBlocks(html)) {
    for (const node of flattenNodes(block)) {
      const type = node["@type"];
      const types = Array.isArray(type) ? type.map(String) : type ? [String(type)] : [];
      if (types.includes("Product")) count += 1;
    }
  }
  return count;
}

async function fetchHtml(origin: string, path: string): Promise<string | null> {
  const url = `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html",
        "User-Agent": "AnatolianPaw-ProductSnippetHealth/1.0",
      },
      redirect: "follow",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function runProductSnippetHealthCheck(): Promise<ProductSnippetHealthResult> {
  const site = await getDefaultSite();
  const siteUrl = getPublicSiteUrl();
  const findings: ProductSnippetHealthFinding[] = [];

  const collectionPaths = [
    "/collections/all",
    ...LANDING_COLLECTION_SLUGS.map((slug) => `/collections/${slug}`),
  ];

  let nestedProductOnCollections = 0;
  let collectionUrlsChecked = 0;

  for (const path of collectionPaths) {
    const html = await fetchHtml(siteUrl, path);
    if (!html) {
      findings.push({
        severity: "warn",
        code: "collection_fetch_failed",
        title: "Koleksiyon sayfası okunamadı",
        detail: `${path} canlı HTML alınamadı.`,
        path,
        fixHint: "Deploy / bakım durumunu kontrol edin ve yeniden tarayın.",
      });
      continue;
    }
    collectionUrlsChecked += 1;
    const productCount = countNestedProducts(html);
    if (productCount > 0) {
      nestedProductOnCollections += productCount;
      findings.push({
        severity: "fail",
        code: "nested_product_on_collection",
        title: "Koleksiyon sayfasında Product şeması",
        detail: `${path} üzerinde JSON-LD içinde ${productCount} Product bulundu. Google bunları ürün snippet’i sayar ve aggregateRating ister.`,
        path,
        fixHint:
          "ItemList yalnızca ListItem name+url üretmeli; Product JSON-LD yalnızca /products/... PDP’de olmalı.",
      });
    }
  }

  if (nestedProductOnCollections === 0 && collectionUrlsChecked > 0) {
    findings.push({
      severity: "ok",
      code: "collections_clean",
      title: "Koleksiyon ItemList temiz",
      detail:
        "Koleksiyon sayfalarında iç içe Product şeması yok — GSC “aggregateRating eksik” uyarısının kaynağı burası olmamalı.",
    });
  }

  const products = await prisma.storeProduct.findMany({
    where: { siteId: site.id, ...storefrontListedWhere },
    orderBy: { title: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      reviews: {
        where: { status: "approved" },
        select: { id: true },
      },
    },
  });

  const productsMissingReviews: ProductSnippetHealthProductRow[] = [];
  let productsWithReviews = 0;

  for (const p of products) {
    const count = p.reviews.length;
    if (count > 0) {
      productsWithReviews += 1;
    } else {
      productsMissingReviews.push({
        id: p.id,
        slug: p.slug,
        title: p.title,
        path: `/products/${p.slug}`,
        approvedReviewCount: 0,
        hasAggregateRatingOnPdp: false,
      });
    }
  }

  if (productsMissingReviews.length) {
    findings.push({
      severity: "warn",
      code: "products_without_reviews",
      title: "Yorumu olmayan ürünler",
      detail: `${productsMissingReviews.length} yayındaki üründe onaylı yorum yok. PDP’de aggregateRating ancak gerçek yorumlarla eklenir (uydurma puan kullanılmaz).`,
      fixHint: "Admin → Yorumlar’dan onaylı yorum ekleyin veya müşteri yorumlarını onaylayın.",
    });
  } else if (products.length) {
    findings.push({
      severity: "ok",
      code: "all_products_have_reviews",
      title: "Tüm ürünlerde yorum var",
      detail: "Yayındaki ürünlerin hepsinde en az bir onaylı yorum var; PDP AggregateRating üretilebilir.",
    });
  }

  return {
    scannedAt: new Date().toISOString(),
    siteUrl,
    summary: {
      collectionUrlsChecked,
      nestedProductOnCollections,
      productsWithoutReviews: productsMissingReviews.length,
      productsWithReviews,
      publishedProducts: products.length,
    },
    findings,
    productsMissingReviews: productsMissingReviews.slice(0, 40),
    gscSteps: [
      "Search Console → Geliştirmeler → Ürün snippet’leri → “aggregateRating alanı eksik”",
      "Örnek URL’yi URL Denetimi ile test edin; koleksiyon sayfasında artık Product snippet uyarısı olmamalı.",
      "Doğrulamayı başlatın (Google yeniden tarar; temizlik birkaç gün sürebilir).",
      "Ürün yıldızları için yalnızca /products/... sayfalarını hedefleyin; yorumları Admin → Yorumlar’dan yönetin.",
    ],
  };
}
