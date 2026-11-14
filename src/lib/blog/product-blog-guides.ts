import "server-only";

import { listPublishedBlogPosts } from "@/lib/blog/blog-posts-server";
import { blogTitle, type BlogPostRecord } from "@/lib/blog/blog-post-types";
import type { ShopLocale } from "@/lib/i18n/locale";

export type ProductBlogGuideLink = {
  href: string;
  title: string;
};

/** Ürün slug/başlığına göre 1–2 rehber yazısı */
export async function resolveProductBlogGuides(
  siteId: string,
  product: { slug: string; title: string },
  locale: ShopLocale,
  limit = 2,
): Promise<ProductBlogGuideLink[]> {
  const posts = await listPublishedBlogPosts(siteId);
  if (!posts.length) return [];

  const seed = tokenize(`${product.slug} ${product.title}`);
  const ranked = posts
    .map((p) => {
      const tokens = tokenize(`${p.slug} ${blogTitle(p, locale)}`);
      let score = overlap(seed, tokens);
      // Bilinen konu boost'ları
      score += topicBoost(product.slug, product.title, p);
      return { p, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const picked = (ranked.length ? ranked : fallbackRank(posts)).slice(0, limit);
  return picked.map(({ p }) => ({
    href: `/blogs/news/${p.slug}`,
    title: blogTitle(p, locale),
  }));
}

function fallbackRank(posts: BlogPostRecord[]) {
  const preferred = [
    "kopek-odul-mamasi-nasil-secilir",
    "dogal-kopek-odulu-nedir",
    "kopek-odul-mamasi",
  ];
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const out: { p: BlogPostRecord; score: number }[] = [];
  for (const slug of preferred) {
    const p = bySlug.get(slug);
    if (p) out.push({ p, score: 1 });
  }
  if (out.length) return out;
  // Son çare: en yeni
  return posts.slice(0, 2).map((p) => ({ p, score: 1 }));
}

function topicBoost(productSlug: string, productTitle: string, post: BlogPostRecord): number {
  const hay = `${productSlug} ${productTitle}`.toLocaleLowerCase("tr-TR");
  const slug = post.slug;
  let bonus = 0;
  if (/deve|derisi/.test(hay) && /deve|derisi/.test(slug)) bonus += 3;
  if (/yavru|puppy/.test(hay) && /yavru/.test(slug)) bonus += 3;
  if (/egitim|eğitim|odak|training/.test(hay) && /egitim|tuvalet/.test(slug)) bonus += 3;
  if (/alerji|allergy|tahilsiz|tahılsız/.test(hay) && /alerjik|dogal/.test(slug)) bonus += 3;
  if (/dis|diş|kemik|cigneme|çiğneme/.test(hay) && /dis|kemik|deve/.test(slug)) bonus += 3;
  if (/akciger|akciğer|girtlak|gırtlak/.test(hay) && /odul|dogal|secilir/.test(slug)) bonus += 1;
  if (/freeze|kurutul/.test(hay) && /freeze|kurutul|dogal/.test(slug)) bonus += 2;
  return bonus;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLocaleLowerCase("tr-TR")
      .replace(/[^a-z0-9ğüşıöçâîû\s-]/gi, " ")
      .split(/[\s-]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}
