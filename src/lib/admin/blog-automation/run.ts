import "server-only";

import { generateAiBlogCopy } from "@/lib/admin/blog-automation/ai-blog";
import {
  getBlogAutomationConfig,
  isWithinAutomationDateRange,
  type ResolvedBlogAutomationConfig,
} from "@/lib/admin/blog-automation/settings";
import {
  collectBlogTopicCandidates,
  loadRelatedProductsForKeyword,
  pickNextBlogTopic,
  type BlogTopicCandidate,
} from "@/lib/admin/blog-automation/topics";
import { slugify } from "@/lib/admin/slug";
import { getSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import { revalidateBlogPaths } from "@/lib/blog/revalidate-blog";
import { prisma } from "@/lib/prisma";

export type BlogAutomationRunResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  topic?: string;
  postId?: string;
  slug?: string;
  published?: boolean;
  aiMessage?: string;
};

function startOfWeek(d = new Date()): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function postsCreatedThisWeek(siteId: string): Promise<number> {
  const from = startOfWeek();
  return prisma.storeBlogPost.count({
    where: {
      siteId,
      createdAt: { gte: from },
    },
  });
}

async function uniqueSlug(siteId: string, base: string): Promise<string> {
  let slug = slugify(base);
  let n = 0;
  while (true) {
    const candidate = n ? `${slug}-${n}` : slug;
    const exists = await prisma.storeBlogPost.findFirst({
      where: { siteId, slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    n += 1;
  }
}

export async function createBlogPostFromTopic(params: {
  siteId: string;
  siteName: string;
  topic: BlogTopicCandidate;
  config: ResolvedBlogAutomationConfig;
  forcePublish?: boolean;
}): Promise<BlogAutomationRunResult> {
  const aiConfig = await getSeoAiConfig(params.siteId);
  const copy = await generateAiBlogCopy(
    {
      keyword: params.topic.keyword,
      siteName: params.siteName,
      author: params.config.author || undefined,
      relatedProducts: params.config.linkProducts ? params.topic.relatedProducts : [],
    },
    aiConfig,
  );

  const slug = await uniqueSlug(params.siteId, params.topic.keyword);
  const publish = params.forcePublish ?? params.config.mode === "auto";
  const imageUrl =
    params.topic.relatedProducts.find((p) => p.imageUrl)?.imageUrl ?? null;

  const post = await prisma.storeBlogPost.create({
    data: {
      siteId: params.siteId,
      slug,
      titleTr: copy.title,
      excerptTr: copy.excerpt,
      bodyTr: copy.bodyHtml,
      imageUrl,
      author: params.config.author || null,
      publishedAt: publish ? new Date() : null,
      published: publish,
      featuredOnHome: params.config.featuredOnHome,
      seoTitle: copy.seoTitle,
      seoDescription: copy.seoDescription,
    },
  });

  revalidateBlogPaths(post.slug, post.published);

  return {
    ok: true,
    topic: params.topic.keyword,
    postId: post.id,
    slug: post.slug,
    published: post.published,
    aiMessage: copy.message,
  };
}

export async function runBlogAutomation(
  siteId: string,
  siteName: string,
  options?: { force?: boolean; keyword?: string },
): Promise<BlogAutomationRunResult> {
  const config = await getBlogAutomationConfig(siteId);

  if (!config.enabled && !options?.force) {
    return { ok: true, skipped: true, reason: "Otomasyon kapalı" };
  }

  if (!isWithinAutomationDateRange(config) && !options?.force) {
    return { ok: true, skipped: true, reason: "Tarih aralığı dışında" };
  }

  const weeklyCount = await postsCreatedThisWeek(siteId);
  if (weeklyCount >= config.maxPostsPerWeek && !options?.force) {
    return {
      ok: true,
      skipped: true,
      reason: `Haftalık limit (${config.maxPostsPerWeek}) dolu`,
    };
  }

  let topic: BlogTopicCandidate | null = null;
  if (options?.keyword?.trim()) {
    const keyword = options.keyword.trim().toLowerCase();
    const topics = await collectBlogTopicCandidates(siteId, config, { limit: 50 });
    topic = topics.find((t) => t.keyword === keyword) ?? {
      keyword,
      score: 0,
      searchCount: 0,
      productViewCount: 0,
      gscClicks: 0,
      gscImpressions: 0,
      sources: [],
      relatedProducts: await loadRelatedProductsForKeyword(siteId, keyword),
      alreadyCovered: false,
    };
  } else {
    topic = await pickNextBlogTopic(siteId, config);
  }

  if (!topic) {
    return { ok: true, skipped: true, reason: "Uygun konu bulunamadı" };
  }

  if (topic.alreadyCovered && !options?.force) {
    return { ok: true, skipped: true, reason: `"${topic.keyword}" için zaten yazı var` };
  }

  return createBlogPostFromTopic({ siteId, siteName, topic, config });
}
