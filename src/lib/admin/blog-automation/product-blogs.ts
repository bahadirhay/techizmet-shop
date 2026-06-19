import "server-only";

import { generateAiBlogCopy } from "@/lib/admin/blog-automation/ai-blog";
import { loadBlogResearchContext } from "@/lib/admin/blog-automation/blog-research";
import { getBlogAutomationConfig } from "@/lib/admin/blog-automation/settings";
import { slugify } from "@/lib/admin/slug";
import { getSeoAiConfig } from "@/lib/admin/product-seo/ai-settings";
import { revalidateBlogPaths } from "@/lib/blog/revalidate-blog";
import { prisma } from "@/lib/prisma";

import { productBlogSlug } from "@/lib/admin/blog-automation/product-blog-shared";

export type ProductBlogGenerateResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  productSlug?: string;
  postId?: string;
  slug?: string;
  published?: boolean;
  aiMessage?: string;
};

export type ProductBlogsBulkResult = {
  ok: boolean;
  created: number;
  skipped: number;
  failed: number;
  published: number;
  pending: number;
  results: ProductBlogGenerateResult[];
};

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

export async function createBlogPostForProduct(params: {
  siteId: string;
  siteName: string;
  productId: string;
  force?: boolean;
  publish?: boolean;
}): Promise<ProductBlogGenerateResult> {
  const product = await prisma.storeProduct.findFirst({
    where: { id: params.productId, siteId: params.siteId, published: true },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      imageUrl: true,
    },
  });
  if (!product) {
    return { ok: false, reason: "Ürün bulunamadı veya yayından kaldırılmış" };
  }

  const blogSlug = productBlogSlug(product.slug);
  const existing = await prisma.storeBlogPost.findFirst({
    where: { siteId: params.siteId, slug: blogSlug },
    select: { id: true, slug: true, published: true },
  });
  if (existing && !params.force) {
    return {
      ok: true,
      skipped: true,
      reason: existing.published
        ? "Bu ürün için blog zaten yayında"
        : "Bu ürün için taslak zaten var — Blog listesinden düzenleyin",
      productSlug: product.slug,
      postId: existing.id,
      slug: existing.slug,
      published: existing.published,
    };
  }

  const config = await getBlogAutomationConfig(params.siteId);
  const aiConfig = await getSeoAiConfig(params.siteId);
  const research = await loadBlogResearchContext(params.siteId, product.title);
  const copy = await generateAiBlogCopy(
    {
      keyword: product.title,
      siteName: params.siteName,
      author: config.author || undefined,
      relatedProducts: [
        {
          title: product.title,
          slug: product.slug,
          imageUrl: product.imageUrl,
        },
        ...research.products.filter((p) => p.slug !== product.slug),
      ],
      researchContext: research.contextText,
      fixedTitle: `${product.title} — rehber`,
    },
    aiConfig,
    { requireAi: true },
  );

  const publish = params.publish === true;
  const data = {
    titleTr: copy.title,
    titleEn: copy.titleEn || null,
    excerptTr: copy.excerpt,
    excerptEn: copy.excerptEn || null,
    bodyTr: copy.bodyHtml,
    bodyEn: copy.bodyHtmlEn || null,
    imageUrl: product.imageUrl,
    author: config.author || null,
    publishedAt: publish ? new Date() : null,
    published: publish,
    featuredOnHome: false,
    seoTitle: copy.seoTitle,
    seoDescription: copy.seoDescription,
  };

  const post = existing
    ? await prisma.storeBlogPost.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.storeBlogPost.create({
        data: {
          siteId: params.siteId,
          slug: blogSlug,
          ...data,
        },
      });

  revalidateBlogPaths(post.slug, post.published);

  return {
    ok: true,
    productSlug: product.slug,
    postId: post.id,
    slug: post.slug,
    published: post.published,
    aiMessage: publish
      ? `${copy.message} — yayınlandı`
      : `${copy.message} — taslak olarak kaydedildi`,
  };
}

export async function generateMissingProductBlogs(params: {
  siteId: string;
  siteName: string;
  limit?: number;
  publish?: boolean;
}): Promise<ProductBlogsBulkResult> {
  const limit = Math.min(Math.max(params.limit ?? 5, 1), 10);
  const publish = params.publish === true;
  const products = await prisma.storeProduct.findMany({
    where: { siteId: params.siteId, published: true },
    orderBy: [{ title: "asc" }],
    select: { id: true, slug: true },
  });

  const existingPosts = await prisma.storeBlogPost.findMany({
    where: {
      siteId: params.siteId,
      slug: { in: products.map((p) => productBlogSlug(p.slug)) },
    },
    select: { slug: true, published: true },
  });
  const existingBySlug = new Map(existingPosts.map((p) => [p.slug, p]));

  const worklist = products
    .filter((p) => !existingBySlug.has(productBlogSlug(p.slug)))
    .slice(0, limit);

  const results: ProductBlogGenerateResult[] = [];
  let created = 0;
  let skipped = 0;
  let failed = 0;
  let publishedCount = 0;

  for (const product of worklist) {
    try {
      const result = await createBlogPostForProduct({
        siteId: params.siteId,
        siteName: params.siteName,
        productId: product.id,
        publish,
      });
      results.push(result);
      if (result.skipped) skipped += 1;
      else if (result.ok && result.published) publishedCount += 1;
      else if (result.ok) created += 1;
      else failed += 1;
    } catch (e) {
      failed += 1;
      results.push({
        ok: false,
        productSlug: product.slug,
        reason: e instanceof Error ? e.message : "Üretim hatası",
      });
    }
  }

  const pending = products.filter((p) => !existingBySlug.has(productBlogSlug(p.slug))).length;

  return {
    ok: failed === 0,
    created,
    skipped,
    failed,
    published: publishedCount,
    pending,
    results,
  };
}
