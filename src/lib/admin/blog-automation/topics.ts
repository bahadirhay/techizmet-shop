import "server-only";

import { parseEventPayload } from "@/lib/analytics/format-event";
import type { ResolvedBlogAutomationConfig } from "@/lib/admin/blog-automation/settings";
import { getGscConfig } from "@/lib/admin/gsc/settings";
import { gscQueriesToMap, loadGscSyncCache } from "@/lib/admin/gsc/sync";
import { prisma } from "@/lib/prisma";

export type BlogTopicProduct = {
  slug: string;
  title: string;
  imageUrl: string | null;
};

export type BlogTopicCandidate = {
  keyword: string;
  score: number;
  searchCount: number;
  productViewCount: number;
  gscClicks: number;
  gscImpressions: number;
  sources: ("search" | "product_view" | "gsc")[];
  relatedProducts: BlogTopicProduct[];
  alreadyCovered: boolean;
  coveredBySlug?: string;
};

export type BlogTopicQuery = {
  from?: Date;
  to?: Date;
  limit?: number;
};

function normalizeKeyword(raw: string): string | null {
  const k = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (k.length < 2 || k.length > 80) return null;
  return k;
}

function defaultRange(): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 7);
  return { from, to };
}

async function loadSearchCounts(siteId: string, from: Date, to: Date) {
  const rows = await prisma.storeEvent.findMany({
    where: {
      siteId,
      eventType: "search_query",
      createdAt: { gte: from, lte: to },
    },
    select: { payloadJson: true },
    take: 5000,
  });

  const map = new Map<string, number>();
  for (const row of rows) {
    const p = parseEventPayload(row.payloadJson);
    const keyword = normalizeKeyword(String(p.query ?? ""));
    if (!keyword) continue;
    map.set(keyword, (map.get(keyword) ?? 0) + 1);
  }
  return map;
}

async function loadProductViewCounts(siteId: string, from: Date, to: Date) {
  const rows = await prisma.storeEvent.findMany({
    where: {
      siteId,
      eventType: "product_view",
      createdAt: { gte: from, lte: to },
    },
    select: { payloadJson: true },
    take: 8000,
  });

  const slugCounts = new Map<string, number>();
  for (const row of rows) {
    const p = parseEventPayload(row.payloadJson);
    const slug = String(p.slug ?? "").trim();
    if (!slug) continue;
    slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
  }

  if (!slugCounts.size) return new Map<string, { count: number; slug: string; title: string }>();

  const slugs = [...slugCounts.keys()];
  const products = await prisma.storeProduct.findMany({
    where: { siteId, published: true, slug: { in: slugs } },
    select: { slug: true, title: true },
  });

  const map = new Map<string, { count: number; slug: string; title: string }>();
  for (const product of products) {
    const count = slugCounts.get(product.slug) ?? 0;
    if (count <= 0) continue;
    const keyword = normalizeKeyword(product.title);
    if (!keyword) continue;
    const prev = map.get(keyword);
    if (!prev || count > prev.count) {
      map.set(keyword, { count, slug: product.slug, title: product.title });
    }
  }
  return map;
}

async function loadExistingCoverage(siteId: string) {
  const posts = await prisma.storeBlogPost.findMany({
    where: { siteId },
    select: { slug: true, titleTr: true, excerptTr: true, bodyTr: true },
  });
  return posts.map((p) => ({
    slug: p.slug,
    haystack: `${p.titleTr} ${p.excerptTr ?? ""} ${p.bodyTr}`.toLowerCase(),
  }));
}

function isCovered(keyword: string, posts: { slug: string; haystack: string }[]) {
  const k = keyword.toLowerCase();
  for (const post of posts) {
    if (post.haystack.includes(k)) return post.slug;
    const words = k.split(" ").filter((w) => w.length >= 4);
    if (words.length >= 2 && words.every((w) => post.haystack.includes(w))) return post.slug;
  }
  return null;
}

export async function loadRelatedProductsForKeyword(
  siteId: string,
  keyword: string,
): Promise<BlogTopicProduct[]> {
  const contains = { contains: keyword, mode: "insensitive" as const };
  const rows = await prisma.storeProduct.findMany({
    where: {
      siteId,
      published: true,
      OR: [{ title: contains }, { description: contains }, { descriptionHtml: contains }],
    },
    orderBy: { updatedAt: "desc" },
    take: 4,
    select: {
      slug: true,
      title: true,
      imageUrl: true,
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });

  return rows.map((p) => ({
    slug: p.slug,
    title: p.title,
    imageUrl: p.imageUrl || p.images[0]?.url || null,
  }));
}

export async function collectBlogTopicCandidates(
  siteId: string,
  config: ResolvedBlogAutomationConfig,
  query: BlogTopicQuery = {},
): Promise<BlogTopicCandidate[]> {
  const range = defaultRange();
  const from = query.from ?? range.from;
  const to = query.to ?? range.to;
  const limit = query.limit ?? 20;

  const [searchCounts, productViews, coverage, gscConfig, gscCache] = await Promise.all([
    loadSearchCounts(siteId, from, to),
    config.includeProductViews ? loadProductViewCounts(siteId, from, to) : Promise.resolve(new Map()),
    loadExistingCoverage(siteId),
    getGscConfig(siteId),
    loadGscSyncCache(siteId),
  ]);
  const gscCounts = gscQueriesToMap(gscCache, gscConfig);

  const merged = new Map<
    string,
    {
      searchCount: number;
      productViewCount: number;
      gscClicks: number;
      gscImpressions: number;
      sources: Set<"search" | "product_view" | "gsc">;
      topProductSlug?: string;
    }
  >();

  for (const [keyword, count] of searchCounts) {
    merged.set(keyword, {
      searchCount: count,
      productViewCount: 0,
      gscClicks: 0,
      gscImpressions: 0,
      sources: new Set(["search"]),
    });
  }

  for (const [keyword, info] of productViews) {
    const prev = merged.get(keyword);
    if (prev) {
      prev.productViewCount = info.count;
      prev.sources.add("product_view");
      prev.topProductSlug = info.slug;
    } else {
      merged.set(keyword, {
        searchCount: 0,
        productViewCount: info.count,
        gscClicks: 0,
        gscImpressions: 0,
        sources: new Set(["product_view"]),
        topProductSlug: info.slug,
      });
    }
  }

  for (const [keyword, info] of gscCounts) {
    const prev = merged.get(keyword);
    if (prev) {
      prev.gscClicks = info.clicks;
      prev.gscImpressions = info.impressions;
      prev.sources.add("gsc");
    } else {
      merged.set(keyword, {
        searchCount: 0,
        productViewCount: 0,
        gscClicks: info.clicks,
        gscImpressions: info.impressions,
        sources: new Set(["gsc"]),
      });
    }
  }

  const candidates: BlogTopicCandidate[] = [];
  const gscWeight = gscConfig.clickWeight;

  for (const [keyword, data] of merged) {
    const hasSiteSearch = data.searchCount >= config.minSearchCount;
    const hasProductViews = data.productViewCount >= 2;
    const hasGsc = data.gscClicks >= gscConfig.minClicks;
    if (!hasSiteSearch && !hasProductViews && !hasGsc) continue;

    const score = data.searchCount * 3 + data.gscClicks * gscWeight + data.productViewCount;
    if (score < config.minTopicScore) continue;

    const coveredBySlug = isCovered(keyword, coverage);
    const relatedProducts = await loadRelatedProductsForKeyword(siteId, keyword);

    candidates.push({
      keyword,
      score,
      searchCount: data.searchCount,
      productViewCount: data.productViewCount,
      gscClicks: data.gscClicks,
      gscImpressions: data.gscImpressions,
      sources: [...data.sources],
      relatedProducts,
      alreadyCovered: Boolean(coveredBySlug),
      coveredBySlug: coveredBySlug ?? undefined,
    });
  }

  candidates.sort((a, b) => {
    if (a.alreadyCovered !== b.alreadyCovered) return a.alreadyCovered ? 1 : -1;
    return b.score - a.score;
  });

  return candidates.slice(0, limit);
}

export async function pickNextBlogTopic(
  siteId: string,
  config: ResolvedBlogAutomationConfig,
  query: BlogTopicQuery = {},
): Promise<BlogTopicCandidate | null> {
  const topics = await collectBlogTopicCandidates(siteId, config, { ...query, limit: 30 });
  return topics.find((t) => !t.alreadyCovered) ?? null;
}
