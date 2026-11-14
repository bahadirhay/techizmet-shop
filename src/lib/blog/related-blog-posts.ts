import "server-only";

import { listPublishedBlogPosts } from "@/lib/blog/blog-posts-server";
import { blogTitle, type BlogPostRecord } from "@/lib/blog/blog-post-types";
import type { ShopLocale } from "@/lib/i18n/locale";

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

function overlapScore(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n;
}

/** Aynı sitede başlık/slug benzerliğine göre ilgili yazılar */
export async function listRelatedBlogPosts(
  siteId: string,
  current: BlogPostRecord,
  locale: ShopLocale,
  limit = 3,
): Promise<BlogPostRecord[]> {
  const all = await listPublishedBlogPosts(siteId);
  const others = all.filter((p) => p.id !== current.id && p.slug !== current.slug);
  if (!others.length) return [];

  const seed = tokenize(`${current.slug} ${blogTitle(current, locale)} ${current.excerptTr ?? ""}`);

  const ranked = others
    .map((p) => {
      const tokens = tokenize(`${p.slug} ${blogTitle(p, locale)} ${p.excerptTr ?? ""}`);
      const score = overlapScore(seed, tokens);
      const recency = p.publishedAt?.getTime() ?? 0;
      return { p, score, recency };
    })
    .sort((a, b) => b.score - a.score || b.recency - a.recency);

  const withOverlap = ranked.filter((r) => r.score > 0).slice(0, limit);
  if (withOverlap.length >= limit) return withOverlap.map((r) => r.p);

  // Benzerlik yoksa en yeni yazılarla doldur
  const picked = new Set(withOverlap.map((r) => r.p.id));
  for (const r of ranked) {
    if (picked.has(r.p.id)) continue;
    withOverlap.push(r);
    picked.add(r.p.id);
    if (withOverlap.length >= limit) break;
  }
  return withOverlap.map((r) => r.p);
}
