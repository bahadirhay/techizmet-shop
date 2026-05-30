import { htmlToPlainText } from "@/lib/html-plain-text";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  blogBody,
  blogExcerpt,
  blogPostHref,
  blogTitle,
  formatBlogDateLabel,
  type BlogPostRecord,
} from "@/lib/blog/blog-post-types";
import type { FeaturedBlogPostEdit } from "@/lib/mirror-featured-blog";
import {
  patchBlogLinksInChunk,
  reassembleBlogItemHtml,
  splitBlogItemHtmlParts,
} from "@/lib/mirror-blog-item-html";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeBlogImageUrl(url: string): string {
  const u = url.trim().split("?")[0]?.replace(/\{width\}/gi, "") ?? "";
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("/")) return u;
  return `/${u.replace(/^\//, "")}`;
}

/** Lazyload şablonu — doğrudan src ile göster (DB / admin görseli) */
export function setBlogImageInHtmlChunk(chunk: string, url: string, alt: string) {
  const imgUrl = normalizeBlogImageUrl(url);
  if (!imgUrl) return chunk;
  const safeUrl = imgUrl.replace(/"/g, "&quot;");
  const safeAlt = escapeHtml(alt);
  let out = chunk;
  out = out.replace(
    /<img[^>]*class="[^"]*lazyload[^"]*"[^>]*>/i,
    `<img class="no-js-hidden kn-blog-card-img" src="${safeUrl}" data-src="${safeUrl}" data-original="${safeUrl}" alt="${safeAlt}" loading="eager">`,
  );
  out = out.replace(
    /<noscript>\s*<img[^>]*>/i,
    `<noscript><img class="kn-blog-card-img" src="${safeUrl}" alt="${safeAlt}">`,
  );
  return out;
}

function slugFromBlogHref(href: string): string {
  const m = href.match(/\/([^/]+?)(?:\.html)?$/i);
  return m?.[1] ?? "";
}

function patchBlogItemChunk(
  chunk: string,
  post: {
    slug: string;
    title: string;
    excerpt: string;
    imageUrl?: string;
    dateLabel?: string;
    author?: string;
  },
) {
  const href = blogPostHref(post.slug);
  let out = patchBlogLinksInChunk(chunk, href);
  if (post.imageUrl?.trim()) out = setBlogImageInHtmlChunk(out, post.imageUrl.trim(), post.title);
  out = out.replace(
    /class="blog--title[^"]*"[^>]*>[\s\S]*?<\/a>/i,
    `class="blog--title h6 heading-font" aria-label="${escapeHtml(post.title)}">${escapeHtml(post.title)}</a>`,
  );
  if (post.excerpt) {
    out = out.replace(
      /<p class="blog--desc">[\s\S]*?<\/p>/i,
      `<p class="blog--desc">${escapeHtml(post.excerpt)}</p>`,
    );
  }
  if (post.dateLabel) {
    out = out.replace(
      /<li class="blog--data[^"]*">[^<]*<\/li>/i,
      `<li class="blog--data text-large">${escapeHtml(post.dateLabel)}</li>`,
    );
  }
  if (post.author) {
    out = out.replace(
      /<li class="blog--data[^"]* author--name">[^<]*<\/li>/i,
      `<li class="blog--data text-large author--name">${escapeHtml(post.author)}</li>`,
    );
  }
  return out;
}

/** Blog listesi + ana sayfa kartları */
export function applyBlogCardsToHtml(
  html: string,
  posts: Array<{
    slug: string;
    title: string;
    excerpt: string;
    imageUrl?: string;
    dateLabel?: string;
    author?: string;
  }>,
) {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const { prefix, items, suffix } = splitBlogItemHtmlParts(html);
  if (!items.length) return html;

  const patched = items.map((chunk, index) => {
    const href = chunk.match(/href="([^"]+)"/i)?.[1] ?? "";
    const post = bySlug.get(slugFromBlogHref(href)) ?? posts[index];
    if (!post) {
      return chunk.replace(/^\s*/, ' style="display:none!important" ');
    }
    return patchBlogItemChunk(chunk, post);
  });

  return reassembleBlogItemHtml(prefix, patched, suffix);
}

export function blogPostsToFeaturedEdits(
  posts: BlogPostRecord[],
  locale: ShopLocale,
): FeaturedBlogPostEdit[] {
  return posts.map((p) => ({
    postId: p.slug,
    href: blogPostHref(p.slug),
    imageUrl: p.imageUrl ?? undefined,
    titleTr: p.titleTr,
    titleEn: p.titleEn ?? undefined,
    descTr: p.excerptTr ?? undefined,
    descEn: p.excerptEn ?? undefined,
    dateLabel: formatBlogDateLabel(p.publishedAt, locale),
    author: p.author ?? undefined,
  }));
}

/** Tekil blog yazısı — mirror şablonuna DB içeriği */
export function injectBlogArticleIntoHtml(
  html: string,
  post: BlogPostRecord,
  locale: ShopLocale,
  siteName: string,
) {
  const title = blogTitle(post, locale);
  const body = blogBody(post, locale);
  const desc = (post.seoDescription ?? blogExcerpt(post, locale)).slice(0, 320);
  const dateLabel = formatBlogDateLabel(post.publishedAt, locale);
  const author = post.author?.trim() ?? "";

  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)} — ${escapeHtml(siteName)}</title>`);
  if (desc) {
    out = out.replace(
      /<meta name="description" content="[^"]*">/i,
      `<meta name="description" content="${escapeHtml(desc)}">`,
    );
  }
  out = out.replace(
    /<h2 class="page--title[^"]*">[\s\S]*?<\/h2>/i,
    `<h2 class="page--title page--item h2">${escapeHtml(title)}</h2>`,
  );
  if (dateLabel) {
    out = out.replace(
      /<li class="blog--data text-large">[^<]*<\/li>/i,
      `<li class="blog--data text-large">${escapeHtml(dateLabel)}</li>`,
    );
  }
  if (author) {
    out = out.replace(
      /<li class="blog--data text-large author--name">[^<]*<\/li>/i,
      `<li class="blog--data text-large author--name">${escapeHtml(author)}</li>`,
    );
  }
  if (post.imageUrl?.trim()) {
    const bannerBlock = out.match(/<div class="page--banner-img[\s\S]*?<\/div>\s*<\/div>/i)?.[0];
    if (bannerBlock) {
      const patched = setImgUrls(bannerBlock, post.imageUrl.trim(), title);
      out = out.replace(bannerBlock, patched);
    }
  }
  out = out.replace(
    /<div class="main-article--body rte">[\s\S]*?<\/div>\s*(?=<div class="main-article--related">)/i,
    `<div class="main-article--body rte">${body || "<p></p>"}</div>\n      `,
  );
  return out;
}

/** Mirror HTML dosyasından içe aktarma */
export function extractBlogPostFromMirrorHtml(html: string, slug: string) {
  const titleMatch =
    html.match(/<h2 class="page--title[^"]*">([\s\S]*?)<\/h2>/i)?.[1] ??
    html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  const title = titleMatch ? htmlToPlainText(titleMatch).replace(/\s*—.*$/, "").trim() : slug;

  const bodyMatch = html.match(/<div class="main-article--body rte">([\s\S]*?)<\/div>/i)?.[1];
  const bodyTr = bodyMatch?.trim() ?? "";

  const excerpt = htmlToPlainText(bodyTr).slice(0, 280);

  const img =
    html.match(/class="page--banner-img[\s\S]*?data-original="([^"]+)"/i)?.[1] ??
    html.match(/class="page--banner-img[\s\S]*?src="([^"]+)"/i)?.[1];

  const dateLabel = html.match(/<li class="blog--data text-large">([^<]+)</i)?.[1]?.trim();
  const author = html.match(/author--name">([^<]+)</i)?.[1]?.trim();

  return { title, bodyTr, excerpt, imageUrl: img?.split("?")[0], dateLabel, author };
}
